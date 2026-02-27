import { exec } from "child_process";
import { promisify } from "util";
import { saveCommand } from "./db.js";

const execAsync = promisify(exec);

export interface CommandResult {
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
}

export async function executeCommand(
	command: string,
	timeout: number = 30000
): Promise<CommandResult> {
	try {
		const { stdout, stderr } = await execAsync(command, { timeout });
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
		const result = {
			command,
			exitCode: err.code || 1,
			stdout: err.stdout || "",
			stderr: err.stderr || err.message || "",
		};
		saveCommand(result);
		return result;
	}
}
