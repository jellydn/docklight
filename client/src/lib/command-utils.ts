import type { CommandResult } from "./schemas.js";

export function createErrorResult(command: string, error: unknown): CommandResult {
	return {
		command,
		exitCode: 1,
		stdout: "",
		stderr: error instanceof Error ? error.message : "Command failed",
	};
}
