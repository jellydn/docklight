import { exec } from "child_process";
import { promisify } from "util";
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
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\"'\"'")}'`;
}

export function buildRuntimeCommand(command: string, options?: ExecuteCommandOptions): string {
	const trimmedPassword = options?.sudoPassword?.trim();
	const baseCommand = options?.asRoot
		? trimmedPassword
			? `printf '%s\\n' ${shellQuote(trimmedPassword)} | sudo -S -p '' ${command}`
			: `sudo -n ${command}`
		: command;
	const target = process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim();
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
