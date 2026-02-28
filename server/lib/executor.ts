import { exec } from "child_process";
import { promisify } from "util";
import { NodeSSH } from "node-ssh";
import { isCommandAllowed } from "./allowlist.js";
import { saveCommand } from "./db.js";

const execAsync = promisify(exec);

export interface CommandResult {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
}

interface ExecuteCommandOptions {
	asRoot?: boolean;
	sudoPassword?: string;
	preferRootTarget?: boolean;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

function buildSudoCommand(command: string, password?: string): string {
	if (!password) {
		return `sudo -n ${command}`;
	}
	const trimmed = password.trim();
	if (trimmed === "") {
		return `sudo -n ${command}`;
	}
	return `printf '%s\\n' ${shellQuote(trimmed)} | sudo -S -p '' ${command}`;
}

function getSshTarget(options?: ExecuteCommandOptions): string | undefined {
	const defaultTarget = process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim();
	const rootTarget = process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET?.trim();
	const shouldPreferRootTarget = options?.preferRootTarget !== false;
	return options?.asRoot && shouldPreferRootTarget ? rootTarget || defaultTarget : defaultTarget;
}

function getErrorMessage(error: unknown): string {
	const err = error as { message?: string };
	return err.message || "Unknown error";
}

function getSshUser(target: string): string | null {
	const atIndex = target.indexOf("@");
	if (atIndex <= 0) return null;
	return target.slice(0, atIndex).trim().toLowerCase();
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

/** @description Parses "user@host" or "user@host:port". Note: IPv6 not supported. */
function parseTarget(target: string): { host: string; username: string; port: number } | null {
	const atIndex = target.indexOf("@");
	if (atIndex <= 0) return null;
	const username = target.slice(0, atIndex).trim();
	const hostPart = target.slice(atIndex + 1).trim();
	const colonIndex = hostPart.lastIndexOf(":");
	if (colonIndex >= 0) {
		const parsedPort = Number(hostPart.slice(colonIndex + 1));
		if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
			return { host: hostPart.slice(0, colonIndex), username, port: parsedPort };
		}
	}
	return { host: hostPart, username, port: 22 };
}

function buildRemoteCommand(command: string, options?: ExecuteCommandOptions): string {
	return options?.asRoot ? buildSudoCommand(command, options?.sudoPassword) : command;
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** @description Maintains persistent SSH connections to avoid per-command handshake overhead. */
export class SSHPool {
	private connections = new Map<string, NodeSSH>();
	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	async getConnection(target: string, keyPath?: string): Promise<NodeSSH> {
		const existing = this.connections.get(target);
		if (existing?.isConnected()) {
			this.resetIdleTimer(target);
			return existing;
		}
		if (existing) {
			this.closeConnection(target);
		}

		const parsed = parseTarget(target);
		if (!parsed) {
			throw new Error(`Invalid SSH target: ${target}`);
		}

		const ssh = new NodeSSH();
		await ssh.connect({
			host: parsed.host,
			port: parsed.port,
			username: parsed.username,
			privateKeyPath: keyPath || undefined,
			readyTimeout: 10000,
		});

		this.connections.set(target, ssh);
		this.resetIdleTimer(target);
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

export function buildRuntimeCommand(command: string, options?: ExecuteCommandOptions): string {
	const baseCommand = options?.asRoot ? buildSudoCommand(command, options?.sudoPassword) : command;
	const target = getSshTarget(options);
	if (!target || !command.startsWith("dokku ")) {
		return baseCommand;
	}

	const keyPath = process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH?.trim();
	const sshOptions =
		process.env.DOCKLIGHT_DOKKU_SSH_OPTS?.trim() ||
		"-o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10";
	const keyOption = keyPath ? `-i ${shellQuote(keyPath)}` : "";
	return `ssh ${sshOptions} ${keyOption} ${shellQuote(target)} ${shellQuote(baseCommand)}`.trim();
}

async function executeViaPool(
	command: string,
	target: string,
	timeout: number,
	options?: ExecuteCommandOptions
): Promise<CommandResult> {
	const keyPath = process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH?.trim() || undefined;
	const defaultTarget = process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim();
	const rootTarget = process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET?.trim();
	const remoteCommand = buildRemoteCommand(command, options);

	let ssh: NodeSSH;
	try {
		ssh = await sshPool.getConnection(target, keyPath);
	} catch (connError) {
		const connErrMessage = getErrorMessage(connError);
		const isRootTargetAuthError =
			options?.asRoot &&
			options?.preferRootTarget !== false &&
			Boolean(rootTarget) &&
			Boolean(defaultTarget) &&
			/auth|permission denied/i.test(connErrMessage);

		if (isRootTargetAuthError) {
			return executeCommand(command, timeout, {
				asRoot: true,
				sudoPassword: options?.sudoPassword,
				preferRootTarget: false,
			});
		}

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

	let execResult: { stdout: string; stderr: string; code: number | null };
	try {
		execResult = await Promise.race([
			ssh.execCommand(remoteCommand),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error(`Command timed out after ${timeout}ms: ${command}`)),
					timeout
				)
			),
		]);
	} catch (execError) {
		const execErrMessage = getErrorMessage(execError);
		const result: CommandResult = {
			command,
			exitCode: 1,
			stdout: "",
			stderr: execErrMessage || "SSH command execution failed",
		};
		saveCommand(result);
		return result;
	}

	const exitCode = execResult.code ?? 1;
	let stderr = execResult.stderr.trim();

	if (exitCode !== 0 && options?.asRoot) {
		if (/sudo: .*password|a terminal is required|sudo: sorry, you must have a tty/i.test(stderr)) {
			stderr = `${stderr}\nHint: configure passwordless sudo for Dokku commands or set DOCKLIGHT_DOKKU_SSH_TARGET to a root SSH user.`;
		}
	}

	const result: CommandResult = {
		command,
		exitCode,
		stdout: execResult.stdout.trim(),
		stderr,
	};
	saveCommand(result);
	return result;
}

export async function executeCommand(
	command: string,
	timeout: number = 30000,
	options?: ExecuteCommandOptions
): Promise<CommandResult> {
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

	const defaultTarget = process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim();
	const rootTarget = process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET?.trim();
	if (options?.asRoot && defaultTarget && !rootTarget && getSshUser(defaultTarget) === "dokku") {
		const result: CommandResult = {
			command,
			exitCode: 1,
			stdout: "",
			stderr:
				"Root-required command cannot run through dokku SSH wrapper. Set DOCKLIGHT_DOKKU_SSH_ROOT_TARGET=root@<server-ip> for plugin management commands.",
		};
		saveCommand(result);
		return result;
	}

	const sshTarget = getSshTarget(options);
	if (sshTarget && command.startsWith("dokku ")) {
		return executeViaPool(command, sshTarget, timeout, options);
	}

	try {
		const runtimeCommand = buildRuntimeCommand(command, options);
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
		let stderr = err.stderr || err.message || "";

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
		const isRootTargetAuthError =
			options?.asRoot &&
			options?.preferRootTarget !== false &&
			Boolean(rootTarget) &&
			Boolean(defaultTarget) &&
			/permission denied/i.test(stderr);
		if (isRootTargetAuthError) {
			return executeCommand(command, timeout, {
				asRoot: true,
				sudoPassword: options?.sudoPassword,
				preferRootTarget: false,
			});
		}
		if (
			options?.asRoot &&
			/sudo: .*password|a terminal is required|sudo: sorry, you must have a tty/i.test(stderr)
		) {
			stderr = `${stderr}\nHint: configure passwordless sudo for Dokku commands or set DOCKLIGHT_DOKKU_SSH_TARGET to a root SSH user.`;
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

export async function executeCommandAsRoot(
	command: string,
	timeout: number = 30000,
	sudoPassword?: string
): Promise<CommandResult> {
	return executeCommand(command, timeout, { asRoot: true, sudoPassword });
}
