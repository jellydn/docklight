import { executeCommand, executeCommandAsRoot, type CommandResult } from "./executor.js";

interface PluginInputError {
	error: string;
	command: string;
	exitCode: number;
	stderr?: string;
}

export interface PluginInfo {
	name: string;
	enabled: boolean;
	version?: string;
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

function stripAnsi(value: string): string {
	return value.split("\u001b").join("").replace(/\[[0-9;]*m/g, "");
}

function parsePluginLine(line: string): PluginInfo | null {
	const cleanLine = stripAnsi(line).trim();
	if (!cleanLine || cleanLine.startsWith("----") || cleanLine.toLowerCase().includes("name")) {
		return null;
	}

	const parts = cleanLine.split(/\s+/);
	const name = parts[0];
	if (!isSafePluginName(name)) return null;

	const lowered = cleanLine.toLowerCase();
	let enabled = false;
	if (lowered.includes(" enabled ")) enabled = true;
	if (/\s(true|yes)\s/.test(lowered)) enabled = true;
	if (/\s(false|no)\s/.test(lowered)) enabled = false;

	let version: string | undefined;
	if (parts.length >= 3) {
		const candidate = parts[parts.length - 1];
		if (/^[0-9][a-zA-Z0-9._-]*$/.test(candidate)) {
			version = candidate;
		}
	}

	return {
		name,
		enabled,
		version,
	};
}

function validatePluginName(name: string): PluginInputError | null {
	const normalizedName = name.trim();
	if (!normalizedName) {
		return {
			error: "Plugin name is required",
			command: "",
			exitCode: 400,
		};
	}

	if (!isSafePluginName(normalizedName)) {
		return {
			error: "Plugin name contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	return null;
}

export async function getPlugins(): Promise<PluginInfo[] | PluginInputError> {
	const result = await executeCommand("dokku plugin:list");
	if (result.exitCode !== 0) {
		return {
			error: "Failed to list plugins",
			command: result.command,
			exitCode: result.exitCode,
			stderr: result.stderr,
		};
	}

	return result.stdout
		.split("\n")
		.map((line) => parsePluginLine(line))
		.filter((plugin): plugin is PluginInfo => plugin !== null);
}

export async function installPlugin(
	repository: string,
	name?: string,
	sudoPassword?: string
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

	return executeCommandAsRoot(command, 30000, sudoPassword);
}

export async function uninstallPlugin(
	name: string,
	sudoPassword?: string
): Promise<CommandResult | PluginInputError> {
	const validationError = validatePluginName(name);
	if (validationError) return validationError;
	return executeCommandAsRoot(`dokku plugin:uninstall ${name.trim()}`, 30000, sudoPassword);
}

export async function enablePlugin(
	name: string,
	sudoPassword?: string
): Promise<CommandResult | PluginInputError> {
	const validationError = validatePluginName(name);
	if (validationError) return validationError;
	return executeCommandAsRoot(`dokku plugin:enable ${name.trim()}`, 30000, sudoPassword);
}

export async function disablePlugin(
	name: string,
	sudoPassword?: string
): Promise<CommandResult | PluginInputError> {
	const validationError = validatePluginName(name);
	if (validationError) return validationError;
	return executeCommandAsRoot(`dokku plugin:disable ${name.trim()}`, 30000, sudoPassword);
}
