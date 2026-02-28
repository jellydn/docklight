import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";

export interface Buildpack {
	index: number;
	url: string;
}

function createBuildpackError(message: string): {
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

export async function getBuildpacks(
	name: string
): Promise<Buildpack[] | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	const command = DokkuCommands.buildpacksReport(name);

	try {
		const result = await executeCommand(command);

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get buildpacks",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const buildpacks: Buildpack[] = [];
		const lines = result.stdout.split("\n").map((line) => stripAnsi(line));

		for (const line of lines) {
			const buildpackMatch = line.match(/^\s*(\d+)\s+(.+)$/);
			if (buildpackMatch) {
				buildpacks.push({
					index: Number.parseInt(buildpackMatch[1], 10),
					url: buildpackMatch[2].trim(),
				});
			}
		}

		return buildpacks;
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function addBuildpack(
	name: string,
	url: string,
	index?: number
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createBuildpackError("Invalid app name");
	}

	if (!url || typeof url !== "string") {
		return createBuildpackError("Buildpack URL is required");
	}

	const command = DokkuCommands.buildpacksAdd(name, url, index);

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

export async function removeBuildpack(
	name: string,
	url: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createBuildpackError("Invalid app name");
	}

	if (!url || typeof url !== "string") {
		return createBuildpackError("Buildpack URL is required");
	}

	const command = DokkuCommands.buildpacksRemove(name, url);

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

export async function clearBuildpacks(
	name: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createBuildpackError("Invalid app name");
	}

	const command = DokkuCommands.buildpacksClear(name);

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
