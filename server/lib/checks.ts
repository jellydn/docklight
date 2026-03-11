import { type CommandResult, executeCommand } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";
import { logger } from "./logger.js";

export interface ChecksReport {
	disabledList: string;
	skippedList: string;
	computedDisabled: boolean;
	computedSkipAll: boolean;
	computedSkipped: string;
	globalDisabled: boolean;
	globalSkipAll: boolean;
	globalSkipped: string;
}

type ChecksErrorResult = {
	error: string;
	command: string;
	exitCode: number;
	stderr: string;
};

function createChecksError(message: string, command = "", exitCode = 400): ChecksErrorResult {
	return { error: message, command, exitCode, stderr: message };
}

export function parseChecksReport(stdout: string): ChecksReport {
	const report: ChecksReport = {
		disabledList: "",
		skippedList: "",
		computedDisabled: false,
		computedSkipAll: false,
		computedSkipped: "",
		globalDisabled: false,
		globalSkipAll: false,
		globalSkipped: "",
	};

	const lines = stripAnsi(stdout).split("\n");

	for (const line of lines) {
		const disabledListMatch = line.match(/^\s*Checks disabled list:\s*(.*)$/i);
		if (disabledListMatch) {
			report.disabledList = disabledListMatch[1]?.trim() ?? "";
			continue;
		}

		const skippedListMatch = line.match(/^\s*Checks skipped list:\s*(.*)$/i);
		if (skippedListMatch) {
			report.skippedList = skippedListMatch[1]?.trim() ?? "";
			continue;
		}

		const computedDisabledMatch = line.match(/^\s*Checks computed disabled:\s*(.*)$/i);
		if (computedDisabledMatch) {
			report.computedDisabled = computedDisabledMatch[1]?.trim().toLowerCase() === "true";
			continue;
		}

		const computedSkipAllMatch = line.match(/^\s*Checks computed skip all:\s*(.*)$/i);
		if (computedSkipAllMatch) {
			report.computedSkipAll = computedSkipAllMatch[1]?.trim().toLowerCase() === "true";
			continue;
		}

		const computedSkippedMatch = line.match(/^\s*Checks computed skipped:\s*(.*)$/i);
		if (computedSkippedMatch) {
			report.computedSkipped = computedSkippedMatch[1]?.trim() ?? "";
			continue;
		}

		const globalDisabledMatch = line.match(/^\s*Checks global disabled:\s*(.*)$/i);
		if (globalDisabledMatch) {
			report.globalDisabled = globalDisabledMatch[1]?.trim().toLowerCase() === "true";
			continue;
		}

		const globalSkipAllMatch = line.match(/^\s*Checks global skip all:\s*(.*)$/i);
		if (globalSkipAllMatch) {
			report.globalSkipAll = globalSkipAllMatch[1]?.trim().toLowerCase() === "true";
			continue;
		}

		const globalSkippedMatch = line.match(/^\s*Checks global skipped:\s*(.*)$/i);
		if (globalSkippedMatch) {
			report.globalSkipped = globalSkippedMatch[1]?.trim() ?? "";
		}
	}

	return report;
}

export async function getChecksReport(
	name: string
): Promise<ChecksReport | ChecksErrorResult> {
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

export async function runChecks(
	name: string
): Promise<CommandResult | ChecksErrorResult> {
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
