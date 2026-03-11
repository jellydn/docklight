import { type CommandResult, executeCommand } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";
import { logger } from "./logger.js";

export interface ChecksReport {
	disabled: boolean;
	skipped: boolean;
	disabledList: string;
	skippedList: string;
	waitToRetire: number;
}

type ChecksErrorResult = {
	error: string;
	command: string;
	exitCode: number;
	stderr: string;
};

/** Creates an error result object for checks operations */
function createChecksError(message: string, command = "", exitCode = 400): ChecksErrorResult {
	return { error: message, command, exitCode, stderr: message };
}

/** Parses the output of dokku checks:report into a structured ChecksReport object */
export function parseChecksReport(stdout: string): ChecksReport {
	let disabledList = "";
	let skippedList = "";
	let waitToRetire = 60;

	const lines = stripAnsi(stdout).split("\n");

	for (const line of lines) {
		const disabledListMatch = line.match(/^\s*Checks disabled list:\s*(.*)$/i);
		if (disabledListMatch) {
			disabledList = disabledListMatch[1]?.trim() ?? "";
			continue;
		}

		const skippedListMatch = line.match(/^\s*Checks skipped list:\s*(.*)$/i);
		if (skippedListMatch) {
			skippedList = skippedListMatch[1]?.trim() ?? "";
			continue;
		}

		const waitMatch = line.match(/^\s*Checks computed wait to retire:\s*(.*)$/i);
		if (waitMatch) {
			const parsed = Number.parseInt(waitMatch[1]?.trim() ?? "", 10);
			if (!Number.isNaN(parsed)) {
				waitToRetire = parsed;
			}
		}
	}

	return {
		disabled: disabledList === "_all_",
		skipped: skippedList === "_all_",
		disabledList,
		skippedList,
		waitToRetire,
	};
}

/** Fetches the checks report for a Dokku app and parses the CLI output */
export async function getChecksReport(name: string): Promise<ChecksReport | ChecksErrorResult> {
	if (!isValidAppName(name)) {
		return createChecksError("Invalid app name");
	}

	const command = DokkuCommands.checksReport(name);

	try {
		const result = await executeCommand(command);

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get checks report",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		return parseChecksReport(result.stdout);
	} catch (error: unknown) {
		const err = error as { message?: string };
		logger.error({ err }, "Unexpected executor failure while getting checks report");
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

/** Executes dokku checks:run for a Dokku app and returns the command result */
export async function runChecks(name: string): Promise<CommandResult | ChecksErrorResult> {
	if (!isValidAppName(name)) {
		return createChecksError("Invalid app name");
	}

	const command = DokkuCommands.checksRun(name);

	try {
		return await executeCommand(command, 120000);
	} catch (error: unknown) {
		const err = error as { message?: string };
		logger.error({ err }, "Unexpected executor failure while running checks");
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}
