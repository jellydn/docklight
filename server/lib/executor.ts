import { exec } from "child_process";
import { promisify } from "util";
import { NodeSSH } from "node-ssh";
import { isCommandAllowed } from "./allowlist.js";
import { saveCommand } from "./db.js";
import { logger } from "./logger.js";
import { commandRateLimiter } from "./rate-limiter.js";

const execAsync = promisify(exec);

const DEFAULT_SSH_PORT = 22;

type ParsedSshTarget = { host: string; username: string; port: number };

function isValidPort(port: number): boolean {
	return Number.isInteger(port) && port > 0 && port <= 65535;
}

export interface CommandResult {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
}

interface ExecuteCommandOptions {
	userId?: string;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function getSshTarget(): string | undefined {
	return process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim();
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

/**
 * @description Parses SSH target strings with full IPv6 support.
 * Supports: "user@host", "user@host:port", "user@[ipv6]", "user@[ipv6]:port",
 * and "ssh://user@host:port" URLs.
 */
function parseTarget(target: string): ParsedSshTarget | null {
	const input = target.trim();

	// Handle ssh:// URL format
	if (input.startsWith("ssh://")) {
		try {
			const url = new URL(input);
			const username = url.username;
			// URL.hostname keeps brackets for IPv6 (e.g. "[::1]"), so strip them
			const hostname = url.hostname;
			const host = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
			const port = url.port ? Number(url.port) : DEFAULT_SSH_PORT;
			if (!host || !username) return null;
			return { host, username, port };
		} catch {
			return null;
		}
	}

	const atIndex = input.indexOf("@");
	if (atIndex <= 0) return null;
	const username = input.slice(0, atIndex);
	const hostPart = input.slice(atIndex + 1);

	// Handle bracketed IPv6: user@[::1] or user@[::1]:2222
	if (hostPart.startsWith("[")) {
		const closeBracket = hostPart.indexOf("]");
		if (closeBracket === -1) return null;
		const host = hostPart.slice(1, closeBracket);
		const afterBracket = hostPart.slice(closeBracket + 1);
		if (afterBracket === "") {
			return { host, username, port: DEFAULT_SSH_PORT };
		}
		if (afterBracket.startsWith(":")) {
			const parsedPort = Number(afterBracket.slice(1));
			if (isValidPort(parsedPort)) {
				return { host, username, port: parsedPort };
			}
		}
		return null;
	}

	// Handle regular "host" or "host:port"
	const colonIndex = hostPart.indexOf(":");
	if (colonIndex >= 0) {
		const parsedPort = Number(hostPart.slice(colonIndex + 1));
		if (isValidPort(parsedPort)) {
			return { host: hostPart.slice(0, colonIndex), username, port: parsedPort };
		}
	}
	return { host: hostPart, username, port: DEFAULT_SSH_PORT };
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** @description Maintains persistent SSH connections to avoid per-command handshake overhead. */
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

		const parsed = parseTarget(target);
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

async function executeViaPool(
	command: string,
	target: string,
	timeout: number
): Promise<CommandResult> {
	const keyPath = process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH?.trim() || undefined;

	logger.debug({ target, command }, "executeViaPool debug");

	let ssh: NodeSSH;
	try {
		ssh = await sshPool.getConnection(target, keyPath);
	} catch (connError) {
		const connErrMessage = getErrorMessage(connError);

		sshPool.closeConnection(target);
		try {
			ssh = await sshPool.getConnection(target, keyPath);
		} catch (retryError) {
			const retryErrMessage = getErrorMessage(retryError);
			const result: CommandResult = {
				command,
				exitCode: 1,
				stdout: "",
				stderr: `SSH connection failed (initial: ${connErrMessage}, retry: ${retryErrMessage})`,
			};
			saveCommand(result);
			return result;
		}
	}

	const execWithTimeout = async (
		conn: NodeSSH
	): Promise<{ stdout: string; stderr: string; code: number | null }> => {
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() => reject(new Error(`Command timed out after ${timeout}ms: ${command}`)),
				timeout
			);
		});
		try {
			return await Promise.race([conn.execCommand(command), timeoutPromise]);
		} finally {
			if (timeoutId) clearTimeout(timeoutId);
		}
	};

	let execResult: { stdout: string; stderr: string; code: number | null };
	try {
		execResult = await execWithTimeout(ssh);
	} catch (execError) {
		const execErrMessage = getErrorMessage(execError);
		const isChannelError = /channel open failure|open failed/i.test(execErrMessage);

		if (isChannelError) {
			sshPool.closeConnection(target);
			try {
				const freshSsh = await sshPool.getConnection(target, keyPath);
				execResult = await execWithTimeout(freshSsh);
			} catch (retryError) {
				const retryErrMessage = getErrorMessage(retryError);
				const result: CommandResult = {
					command,
					exitCode: 1,
					stdout: "",
					stderr: `SSH channel failed, retry also failed: ${retryErrMessage}`,
				};
				saveCommand(result);
				return result;
			}
		} else {
			const result: CommandResult = {
				command,
				exitCode: 1,
				stdout: "",
				stderr: execErrMessage || "SSH command execution failed",
			};
			saveCommand(result);
			return result;
		}
	}

	const result: CommandResult = {
		command,
		exitCode: execResult.code ?? 1,
		stdout: execResult.stdout.trim(),
		stderr: execResult.stderr.trim(),
	};
	saveCommand(result);
	return result;
}

export async function executeCommand(
	command: string,
	timeout: number = 30000,
	options?: ExecuteCommandOptions
): Promise<CommandResult> {
	// Check rate limit if userId is provided
	if (options?.userId) {
		const rateLimitResult = commandRateLimiter.checkLimit(options.userId);
		if (!rateLimitResult.allowed) {
			const result: CommandResult = {
				command,
				exitCode: 429,
				stdout: "",
				stderr: `Rate limit exceeded. Please try again after ${rateLimitResult.resetAt?.toISOString()}.`,
			};
			saveCommand(result);
			return result;
		}
	}

	if (!isCommandAllowed(command)) {
		const result: CommandResult = {
			command,
			exitCode: 1,
			stdout: "",
			stderr: `Command not allowed: ${command.split(" ")[0]}`,
		};
		saveCommand(result);
		return result;
	}

	const sshTarget = getSshTarget();
	if (sshTarget && command.startsWith("dokku ")) {
		return executeViaPool(command, sshTarget, timeout);
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
		saveCommand(result);
		return result;
	} catch (error: unknown) {
		const err = error as { code?: number; stdout?: string; stderr?: string; message?: string };
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
			saveCommand(result);
			return result;
		}
		const result = {
			command,
			exitCode: err.code || 1,
			stdout: err.stdout || "",
			stderr,
		};
		saveCommand(result);
		return result;
	}
}
