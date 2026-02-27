import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";

export async function getConfig(
	name: string
): Promise<
	Record<string, string> | { error: string; command: string; exitCode: number; stderr: string }
> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		const result = await executeCommand(`dokku config:show ${name}`);

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get config",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const config: Record<string, string> = {};
		const lines = result.stdout.split("\n").filter((line) => line.trim());

		for (const line of lines) {
			const match = line.match(/^(\w+):\s*(.+)$/);
			if (match) {
				config[match[1]] = match[2];
			}
		}

		return config;
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku config:show ${name}`,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function setConfig(
	name: string,
	key: string,
	value: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	// Key must be alphanumeric + underscore (env var convention)
	const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "");
	if (sanitizedKey !== key) {
		return { error: "Invalid characters in key", command: "", exitCode: 400 };
	}

	// Value: block shell injection but allow common chars like quotes, @, #, etc.
	if (/[`$;|<>\\]/.test(value)) {
		return {
			error: "Value contains unsafe shell characters. Remove: ` $ ; | < > \\",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku config:set ${name} ${sanitizedKey}='${value}'`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku config:set ${name} ${sanitizedKey}='${value}'`,
			exitCode: 1,
		};
	}
}

export async function unsetConfig(
	name: string,
	key: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	// Sanitize key to prevent shell injection
	const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "");

	if (sanitizedKey !== key) {
		return {
			error: "Invalid characters in key",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku config:unset ${name} ${sanitizedKey}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku config:unset ${name} ${sanitizedKey}`,
			exitCode: 1,
		};
	}
}
