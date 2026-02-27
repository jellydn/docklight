import { executeCommand, type CommandResult } from "./executor.js";

interface PluginInputError {
	error: string;
	command: string;
	exitCode: number;
}

function normalizeRepository(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	const shorthand = trimmed.match(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/);
	if (shorthand) {
		return `https://github.com/${trimmed}.git`;
	}

	return trimmed;
}

function isSafeRepository(repository: string): boolean {
	return /^[a-zA-Z0-9@:/._-]+$/.test(repository);
}

function isSafePluginName(name: string): boolean {
	return /^[a-zA-Z0-9._-]+$/.test(name);
}

export async function installPlugin(
	repository: string,
	name?: string
): Promise<CommandResult | PluginInputError> {
	const normalizedRepository = normalizeRepository(repository);
	if (!normalizedRepository) {
		return {
			error: "Plugin repository is required",
			command: "",
			exitCode: 400,
		};
	}

	if (!isSafeRepository(normalizedRepository)) {
		return {
			error: "Plugin repository contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	const normalizedName = name?.trim();
	if (normalizedName && !isSafePluginName(normalizedName)) {
		return {
			error: "Plugin name contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	const command = normalizedName
		? `dokku plugin:install ${normalizedRepository} ${normalizedName}`
		: `dokku plugin:install ${normalizedRepository}`;

	return executeCommand(command);
}
