import { exec, spawn } from "child_process";
import { promisify } from "util";
import { NodeSSH } from "node-ssh";
import { isCommandAllowed } from "./allowlist.js";
import { saveCommand } from "./db.js";
import { logger } from "./logger.js";
import { commandRateLimiter } from "./rate-limiter.js";
import { retryWithBackoff } from "./retry.js";
import { getSettings } from "./server-config.js";
import { shellQuote } from "./shell.js";
import { parseSshTarget } from "./ssh-target.js";

const execAsync = promisify(exec);

export interface CommandResult {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
}

interface ExecuteCommandOptions {
	userId?: string;
	skipHistory?: boolean;
}

function maybeSaveCommand(result: CommandResult, skipHistory?: boolean): void {
	if (!skipHistory) {
		saveCommand(result);
	}
}

function createErrorResult(
	command: string,
	message: string,
	exitCode: number = 1,
	skipHistory?: boolean
): CommandResult {
	const result: CommandResult = {
		command,
		exitCode: exitCode > 255 ? 1 : exitCode,
		stdout: "",
		stderr: message,
	};
	maybeSaveCommand(result, skipHistory);
	return result;
}

function getSshTarget(): string | undefined {
	return getSettings().dokkuSshTarget || undefined;
}

function getErrorMessage(error: unknown): string {
	const err = error as { message?: string };
	return err.message || "Unknown error";
}

function isSshWarningOnly(stderr: string): boolean {
	const lines = stderr
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	return (
		lines.length > 0 &&
		lines.every((l) => /^Warning: Permanently added .+ to the list of known hosts/i.test(l))
	);
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export class SSHPool {
	private connections = new Map<string, NodeSSH>();
	private timers = new Map<string, ReturnType<typeof setTimeout>>();
	private pending = new Map<string, Promise<NodeSSH>>();

	async getConnection(target: string, keyPath?: string): Promise<NodeSSH> {
		const existing = this.connections.get(target);
		if (existing?.isConnected()) {
			this.resetIdleTimer(target);
			return existing;
		}
		if (existing) {
			this.closeConnection(target);
		}

		const pendingConn = this.pending.get(target);
		if (pendingConn) {
			return pendingConn;
		}

		const parsed = parseSshTarget(target);
		if (!parsed) {
			throw new Error(`Invalid SSH target: ${target}`);
		}

		const ssh = new NodeSSH();
		const connectPromise = ssh
			.connect({
				host: parsed.host,
				port: parsed.port,
				username: parsed.username,
				privateKeyPath: keyPath || undefined,
				readyTimeout: 10000,
			})
			.then(() => {
				this.pending.delete(target);
				this.connections.set(target, ssh);
				this.resetIdleTimer(target);
				return ssh;
			})
			.catch((err) => {
				this.pending.delete(target);
				throw err;
			});

		this.pending.set(target, connectPromise);
		await connectPromise;
		return ssh;
	}

	private resetIdleTimer(target: string): void {
		const existing = this.timers.get(target);
		if (existing) clearTimeout(existing);
		const timer = setTimeout(() => this.closeConnection(target), IDLE_TIMEOUT_MS);
		timer.unref();
		this.timers.set(target, timer);
	}

	closeConnection(target: string): void {
		this.pending.delete(target);
		const conn = this.connections.get(target);
		if (conn) {
			conn.dispose();
			this.connections.delete(target);
		}
		const timer = this.timers.get(target);
		if (timer) {
			clearTimeout(timer);
			this.timers.delete(target);
		}
	}

	closeAll(): void {
		for (const target of [...this.connections.keys()]) {
			this.closeConnection(target);
		}
	}
}

export const sshPool = new SSHPool();

async function execCommandWithTimeout(
	conn: NodeSSH,
	command: string,
	timeout: number,
	options?: {
		onStdout?: (chunk: Buffer) => void;
		onStderr?: (chunk: Buffer) => void;
	}
): Promise<{ stdout: string; stderr: string; code: number | null }> {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(
			() => reject(new Error(`Command timed out after ${timeout}ms: ${command}`)),
			timeout
		);
	});

	try {
		const execPromise = options ? conn.execCommand(command, options) : conn.execCommand(command);
		return await Promise.race([execPromise, timeoutPromise]);
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}
}

export function buildRuntimeCommand(command: string): string {
	const target = getSshTarget();
	if (!target || !command.startsWith("dokku ")) {
		return command;
	}

	const keyPath = process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH?.trim();
	const sshOptions =
		process.env.DOCKLIGHT_DOKKU_SSH_OPTS?.trim() ||
		"-o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10";
	const keyOption = keyPath ? `-i ${shellQuote(keyPath)}` : "";
	return `ssh ${sshOptions} ${keyOption} ${shellQuote(target)} ${shellQuote(command)}`.trim();
}

async function executeViaSshPool(
	command: string,
	target: string,
	timeout: number,
	options?: ExecuteCommandOptions,
	execOptions?: { onStdout?: (chunk: Buffer) => void; onStderr?: (chunk: Buffer) => void },
	onProgress?: ProgressCallback
): Promise<CommandResult> {
	const keyPath = getSettings().dokkuSshKeyPath || undefined;

	logger.debug({ target, command }, "executeViaSshPool debug");
	onProgress?.({ type: "progress", message: "Connecting to SSH..." });

	let ssh: NodeSSH;
	try {
		ssh = await retryWithBackoff(
			async () => {
				try {
					return await sshPool.getConnection(target, keyPath);
				} catch (error) {
					sshPool.closeConnection(target);
					onProgress?.({ type: "progress", message: "Reconnecting to SSH..." });
					throw error;
				}
			},
			{ maxRetries: 2, baseDelay: 100 }
		);
	} catch (connError) {
		return createErrorResult(
			command,
			`SSH connection failed after retries: ${getErrorMessage(connError)}`,
			1,
			options?.skipHistory
		);
	}

	onProgress?.({ type: "progress", message: `Running ${command}...` });

	let execResult: { stdout: string; stderr: string; code: number | null };
	try {
		try {
			execResult = await execCommandWithTimeout(ssh, command, timeout, execOptions);
		} catch (error) {
			const errMessage = getErrorMessage(error);
			const isChannelError = /channel open failure|open failed|unable to exec/i.test(errMessage);
			if (isChannelError) {
				sshPool.closeConnection(target);
				onProgress?.({ type: "progress", message: "Reconnecting SSH channel..." });
				const freshSsh = await sshPool.getConnection(target, keyPath);
				execResult = await execCommandWithTimeout(freshSsh, command, timeout, execOptions);
			} else {
				throw error;
			}
		}
	} catch (execError) {
		return createErrorResult(
			command,
			`SSH command execution failed: ${getErrorMessage(execError)}`,
			1,
			options?.skipHistory
		);
	}

	const result: CommandResult = {
		command,
		exitCode: execResult.code ?? 1,
		stdout: execResult.stdout.trim(),
		stderr: execResult.stderr.trim(),
	};
	maybeSaveCommand(result, options?.skipHistory);
	return result;
}

async function executeViaPool(
	command: string,
	target: string,
	timeout: number,
	options?: ExecuteCommandOptions
): Promise<CommandResult> {
	return executeViaSshPool(command, target, timeout, options);
}

export type ProgressCallback = (event: {
	type: "progress" | "output";
	message: string;
	error?: boolean;
}) => void;

function makeStreamingExecOptions(onProgress: ProgressCallback) {
	return {
		onStdout: (chunk: Buffer) => {
			for (const line of chunk.toString().split("\n")) {
				if (line.trim()) {
					onProgress({ type: "output", message: line.trim() });
				}
			}
		},
		onStderr: (chunk: Buffer) => {
			for (const line of chunk.toString().split("\n")) {
				if (line.trim()) {
					onProgress({ type: "output", message: line.trim(), error: true });
				}
			}
		},
	};
}

async function executeViaPoolStreaming(
	command: string,
	target: string,
	timeout: number,
	onProgress: ProgressCallback,
	options?: ExecuteCommandOptions
): Promise<CommandResult> {
	return executeViaSshPool(
		command,
		target,
		timeout,
		options,
		makeStreamingExecOptions(onProgress),
		onProgress
	);
}

export async function executeCommandStreaming(
	command: string,
	onProgress: ProgressCallback,
	timeout: number = 30000,
	options?: ExecuteCommandOptions
): Promise<CommandResult> {
	if (options?.userId) {
		const rateLimitResult = commandRateLimiter.checkLimit(options.userId);
		if (!rateLimitResult.allowed) {
			return createErrorResult(
				command,
				`Rate limit exceeded. Please try again after ${rateLimitResult.resetAt?.toISOString()}.`,
				429,
				options?.skipHistory
			);
		}
	}

	if (!isCommandAllowed(command)) {
		return createErrorResult(
			command,
			`Command not allowed: ${command.split(" ")[0]}`,
			1,
			options?.skipHistory
		);
	}

	const sshTarget = getSshTarget();
	if (sshTarget && command.startsWith("dokku ")) {
		return executeViaPoolStreaming(command, sshTarget, timeout, onProgress, options);
	}

	onProgress({ type: "progress", message: `Running ${command}...` });

	return new Promise((resolve) => {
		const runtimeCommand = buildRuntimeCommand(command);
		const child = spawn("sh", ["-c", runtimeCommand]);

		let stdout = "";
		let stderr = "";
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		let resolved = false;

		const finish = (result: CommandResult) => {
			if (resolved) return;
			resolved = true;
			if (timeoutId) clearTimeout(timeoutId);
			maybeSaveCommand(result, options?.skipHistory);
			resolve(result);
		};

		if (timeout > 0) {
			timeoutId = setTimeout(() => {
				child.kill();
				finish({
					command,
					exitCode: 1,
					stdout: stdout.trim(),
					stderr: `Command timed out after ${timeout}ms`,
				});
			}, timeout);
		}

		child.stdout?.on("data", (data: Buffer) => {
			const text = data.toString();
			stdout += text;
			for (const line of text.split("\n")) {
				if (line.trim()) {
					onProgress({ type: "output", message: line.trim() });
				}
			}
		});

		child.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			stderr += text;
			for (const line of text.split("\n")) {
				if (line.trim()) {
					onProgress({ type: "output", message: line.trim(), error: true });
				}
			}
		});

		child.on("close", (code) => {
			if (code === 255 && stdout.trim().length > 0 && isSshWarningOnly(stderr)) {
				finish({
					command,
					exitCode: 0,
					stdout: stdout.trim(),
					stderr: stderr.trim(),
				});
				return;
			}
			finish({
				command,
				exitCode: code ?? 1,
				stdout: stdout.trim(),
				stderr: stderr.trim(),
			});
		});

		child.on("error", (error: Error) => {
			finish({
				command,
				exitCode: 1,
				stdout: stdout.trim(),
				stderr: error.message,
			});
		});
	});
}

export async function executeCommand(
	command: string,
	timeout: number = 30000,
	options?: ExecuteCommandOptions
): Promise<CommandResult> {
	if (options?.userId) {
		const rateLimitResult = commandRateLimiter.checkLimit(options.userId);
		if (!rateLimitResult.allowed) {
			return createErrorResult(
				command,
				`Rate limit exceeded. Please try again after ${rateLimitResult.resetAt?.toISOString()}.`,
				429,
				options?.skipHistory
			);
		}
	}

	if (!isCommandAllowed(command)) {
		return createErrorResult(
			command,
			`Command not allowed: ${command.split(" ")[0]}`,
			1,
			options?.skipHistory
		);
	}

	const sshTarget = getSshTarget();
	if (sshTarget && command.startsWith("dokku ")) {
		return executeViaPool(command, sshTarget, timeout, options);
	}

	try {
		const runtimeCommand = buildRuntimeCommand(command);
		const { stdout, stderr } = await execAsync(runtimeCommand, { timeout });
		const result = {
			command,
			exitCode: 0,
			stdout: stdout.trim(),
			stderr: stderr.trim(),
		};
		maybeSaveCommand(result, options?.skipHistory);
		return result;
	} catch (error: unknown) {
		const err = error as {
			code?: number;
			stdout?: string;
			stderr?: string;
			message?: string;
		};
		const stderr = err.stderr || err.message || "";

		if (
			err.code === 255 &&
			err.stdout &&
			err.stdout.trim().length > 0 &&
			isSshWarningOnly(stderr)
		) {
			const result = {
				command,
				exitCode: 0,
				stdout: err.stdout.trim(),
				stderr: stderr.trim(),
			};
			maybeSaveCommand(result, options?.skipHistory);
			return result;
		}
		const result = {
			command,
			exitCode: err.code || 1,
			stdout: err.stdout || "",
			stderr,
		};
		maybeSaveCommand(result, options?.skipHistory);
		return result;
	}
}
