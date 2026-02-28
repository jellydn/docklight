import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { splitShellWords } from "./shell.js";
import { DokkuCommands } from "./dokku.js";

export interface DockerOptions {
	build: string[];
	deploy: string[];
	run: string[];
}

function createDockerOptionsError(message: string): {
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

function validatePhase(phase: string): string | null {
	const validPhases = ["build", "deploy", "run"];
	if (!validPhases.includes(phase.toLowerCase())) {
		return "Phase must be one of: build, deploy, run";
	}
	return null;
}

export async function getDockerOptions(
	name: string
): Promise<DockerOptions | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		const result = await executeCommand(DokkuCommands.dockerOptionsReport(name));

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get docker options",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const dockerOptions: DockerOptions = {
			build: [],
			deploy: [],
			run: [],
		};

		const lines = result.stdout.split("\n").map((line) => stripAnsi(line));

		for (const line of lines) {
			const buildMatch = line.match(/^Docker options build:\s*(.*)$/i);
			if (buildMatch?.[1].trim()) {
				dockerOptions.build = splitShellWords(buildMatch[1].trim());
			}

			const deployMatch = line.match(/^Docker options deploy:\s*(.*)$/i);
			if (deployMatch?.[1].trim()) {
				dockerOptions.deploy = splitShellWords(deployMatch[1].trim());
			}

			const runMatch = line.match(/^Docker options run:\s*(.*)$/i);
			if (runMatch?.[1].trim()) {
				dockerOptions.run = splitShellWords(runMatch[1].trim());
			}
		}

		return dockerOptions;
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.dockerOptionsReport(name),
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function addDockerOption(
	name: string,
	phase: string,
	option: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDockerOptionsError("Invalid app name");
	}

	const phaseValidationError = validatePhase(phase);
	if (phaseValidationError) {
		return createDockerOptionsError(phaseValidationError);
	}

	if (!option || typeof option !== "string") {
		return createDockerOptionsError("Docker option is required");
	}

	try {
		return executeCommand(DokkuCommands.dockerOptionsAdd(name, phase, option));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.dockerOptionsAdd(name, phase, option),
			exitCode: 1,
		};
	}
}

export async function removeDockerOption(
	name: string,
	phase: string,
	option: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDockerOptionsError("Invalid app name");
	}

	const phaseValidationError = validatePhase(phase);
	if (phaseValidationError) {
		return createDockerOptionsError(phaseValidationError);
	}

	if (!option || typeof option !== "string") {
		return createDockerOptionsError("Docker option is required");
	}

	try {
		return executeCommand(DokkuCommands.dockerOptionsRemove(name, phase, option));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.dockerOptionsRemove(name, phase, option),
			exitCode: 1,
		};
	}
}

export async function clearDockerOptions(
	name: string,
	phase: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDockerOptionsError("Invalid app name");
	}

	const phaseValidationError = validatePhase(phase);
	if (phaseValidationError) {
		return createDockerOptionsError(phaseValidationError);
	}

	try {
		return executeCommand(DokkuCommands.dockerOptionsClear(name, phase));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.dockerOptionsClear(name, phase),
			exitCode: 1,
		};
	}
}
