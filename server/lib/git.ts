import { type CommandResult, executeCommand } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";
import { logger } from "./logger.js";

export interface GitInfo {
	deployBranch: string;
	globalDeployBranch: string;
	keepGitDir: boolean;
	revEnvVar: string;
	sha: string;
	sourceImage: string;
	lastUpdatedAt: string;
}

type GitErrorResult = {
	error: string;
	command: string;
	exitCode: number;
	stderr: string;
};

function createGitError(message: string, command = "", exitCode = 400): GitErrorResult {
	return { error: message, command, exitCode, stderr: message };
}

export async function getGitInfo(name: string): Promise<GitInfo | GitErrorResult> {
	if (!isValidAppName(name)) {
		return createGitError("Invalid app name");
	}

	const command = DokkuCommands.gitReport(name);

	try {
		const result = await executeCommand(command);

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get git info",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		return parseGitReport(result.stdout);
	} catch (error: unknown) {
		const err = error as { message?: string };
		logger.error({ err }, "Unexpected executor failure while getting git info");
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export function parseGitReport(stdout: string): GitInfo {
	const info: GitInfo = {
		deployBranch: "",
		globalDeployBranch: "",
		keepGitDir: false,
		revEnvVar: "",
		sha: "",
		sourceImage: "",
		lastUpdatedAt: "",
	};

	const lines = stripAnsi(stdout).split("\n");

	for (const line of lines) {
		const deployBranchMatch = line.match(/^\s*Git deploy branch:\s*(.*)$/i);
		if (deployBranchMatch) {
			info.deployBranch = deployBranchMatch[1]?.trim() ?? "";
			continue;
		}

		const globalDeployBranchMatch = line.match(/^\s*Git global deploy branch:\s*(.*)$/i);
		if (globalDeployBranchMatch) {
			info.globalDeployBranch = globalDeployBranchMatch[1]?.trim() ?? "";
			continue;
		}

		const keepGitDirMatch = line.match(/^\s*Git keep git dir:\s*(.*)$/i);
		if (keepGitDirMatch) {
			info.keepGitDir = keepGitDirMatch[1]?.trim().toLowerCase() === "true";
			continue;
		}

		const revEnvVarMatch = line.match(/^\s*Git rev env var:\s*(.*)$/i);
		if (revEnvVarMatch) {
			info.revEnvVar = revEnvVarMatch[1]?.trim() ?? "";
			continue;
		}

		const shaMatch = line.match(/^\s*Git sha:\s*(.*)$/i);
		if (shaMatch) {
			info.sha = shaMatch[1]?.trim() ?? "";
			continue;
		}

		const sourceImageMatch = line.match(/^\s*Git source image:\s*(.*)$/i);
		if (sourceImageMatch) {
			info.sourceImage = sourceImageMatch[1]?.trim() ?? "";
			continue;
		}

		const lastUpdatedAtMatch = line.match(/^\s*Git last updated at:\s*(.*)$/i);
		if (lastUpdatedAtMatch) {
			info.lastUpdatedAt = lastUpdatedAtMatch[1]?.trim() ?? "";
		}
	}

	return info;
}

export async function syncFromRepo(
	name: string,
	repo: string,
	branch?: string
): Promise<CommandResult | GitErrorResult> {
	if (!isValidAppName(name)) {
		return createGitError("Invalid app name");
	}

	if (!repo || typeof repo !== "string") {
		return createGitError("Repository URL is required");
	}

	const normalizedRepo = repo.trim();
	if (!isValidRepoUrl(normalizedRepo)) {
		return createGitError("Invalid repository URL");
	}

	const { execCommand, displayCommand } = DokkuCommands.gitSync(name, normalizedRepo, branch);

	try {
		return await executeCommand(execCommand, 120000);
	} catch (error: unknown) {
		const err = error as { message?: string };
		logger.error({ err }, "Unexpected executor failure while syncing from git repo");
		return {
			error: err.message || "Unknown error occurred",
			command: displayCommand,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export function isValidRepoUrl(url: string): boolean {
	if (!url || typeof url !== "string") return false;
	const trimmed = url.trim();
	if (!trimmed) return false;
	return (
		/^https?:\/\/.+/.test(trimmed) || /^git@.+:.+/.test(trimmed) || /^ssh:\/\/.+/.test(trimmed)
	);
}
