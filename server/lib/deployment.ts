import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";

export interface DeploymentSettings {
	deployBranch: string;
	buildDir: string;
	builder: string;
}

const VALID_BUILDERS = ["herokuish", "dockerfile", "pack", ""];

function createDeploymentError(message: string): {
	error: string;
	command: string;
	exitCode: number;
} {
	return {
		error: message,
		command: "",
		exitCode: 400,
	};
}

function isValidBuilder(builder: string): boolean {
	return VALID_BUILDERS.includes(builder);
}

export async function getDeploymentSettings(
	name: string
): Promise<
	DeploymentSettings | { error: string; command: string; exitCode: number; stderr: string }
> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	const gitCommand = DokkuCommands.gitReport(name);
	const builderCommand = DokkuCommands.builderReport(name);

	try {
		const [gitResult, builderResult] = await Promise.all([
			executeCommand(gitCommand),
			executeCommand(builderCommand),
		]);

		if (gitResult.exitCode !== 0) {
			return {
				error: "Failed to get deployment settings",
				command: gitResult.command,
				exitCode: gitResult.exitCode,
				stderr: gitResult.stderr,
			};
		}

		const settings: DeploymentSettings = {
			deployBranch: "",
			buildDir: "",
			builder: "",
		};

		const gitLines = gitResult.stdout.split("\n").map((line) => stripAnsi(line));
		for (const line of gitLines) {
			const deployBranchMatch = line.match(/^\s*Git deploy branch:\s*(.*)$/i);
			if (deployBranchMatch) {
				settings.deployBranch = deployBranchMatch[1]?.trim() ?? "";
			}
		}

		if (builderResult.exitCode === 0) {
			const builderLines = builderResult.stdout.split("\n").map((line) => stripAnsi(line));
			for (const line of builderLines) {
				const buildDirMatch = line.match(/^\s*Builder build directory:\s*(.*)$/i);
				if (buildDirMatch) {
					settings.buildDir = buildDirMatch[1]?.trim() ?? "";
				}

				const selectedBuilderMatch = line.match(/^\s*Builder selected:\s*(.*)$/i);
				if (selectedBuilderMatch) {
					settings.builder = selectedBuilderMatch[1]?.trim() ?? "";
				}
			}
		}

		return settings;
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `${gitCommand} && ${builderCommand}`,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function setDeployBranch(
	name: string,
	branch: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDeploymentError("Invalid app name");
	}

	if (!branch || typeof branch !== "string") {
		return createDeploymentError("Deploy branch is required");
	}

	const command = DokkuCommands.gitSetDeployBranch(name, branch);

	try {
		return executeCommand(command);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
		};
	}
}

export async function setBuildDir(
	name: string,
	dir: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDeploymentError("Invalid app name");
	}

	const command =
		dir === ""
			? DokkuCommands.builderClearBuildDir(name)
			: DokkuCommands.builderSetBuildDir(name, dir);

	try {
		return executeCommand(command);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
		};
	}
}

export async function clearBuildDir(
	name: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDeploymentError("Invalid app name");
	}

	const command = DokkuCommands.builderClearBuildDir(name);

	try {
		return executeCommand(command);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
		};
	}
}

export async function setBuilder(
	name: string,
	builder: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDeploymentError("Invalid app name");
	}

	if (!isValidBuilder(builder)) {
		return createDeploymentError(
			`Invalid builder. Must be one of: ${VALID_BUILDERS.filter((b) => b).join(", ")} or empty for auto-detect`
		);
	}

	const command =
		builder === ""
			? DokkuCommands.builderClearSelected(name)
			: DokkuCommands.builderSetSelected(name, builder);

	try {
		return executeCommand(command);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
		};
	}
}
