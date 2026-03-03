import { executeCommand } from "./executor.js";
import { DokkuCommands } from "./dokku.js";
import { stripAnsi } from "./ansi.js";
import { logger } from "./logger.js";

export interface PluginInfo {
	name: string;
	enabled: boolean;
	version?: string;
}

async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	baseDelay: number = 100
): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt < maxRetries) {
				const delay = baseDelay * 2 ** attempt;
				logger.warn({ attempt, delay, error }, "Plugin list failed, retrying...");
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}
	throw lastError;
}

interface PluginInputError {
	error: string;
	command: string;
	exitCode: number;
	stderr?: string;
}

function isSafePluginName(name: string): boolean {
	return /^[a-zA-Z0-9._-]+$/.test(name);
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

export async function getPlugins(): Promise<PluginInfo[] | PluginInputError> {
	const result = await retryWithBackoff(
		async () => executeCommand(DokkuCommands.pluginList()),
		3,
		100
	);
	if (result.exitCode !== 0) {
		return {
			error:
				"Failed to list plugins. Check that DOCKLIGHT_DOKKU_SSH_TARGET is configured correctly. See https://github.com/jellydn/docklight/blob/main/docs/deployment.md",
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
