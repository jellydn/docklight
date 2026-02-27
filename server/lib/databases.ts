import { executeCommand, type CommandResult } from "./executor.js";

export interface Database {
	name: string;
	plugin: string;
	linkedApps: string[];
	connectionInfo: string;
}

// List of supported database plugins
const SUPPORTED_PLUGINS = ["postgres", "redis", "mysql", "mariadb", "mongo"] as const;

export async function getDatabases(): Promise<
	Database[] | { error: string; command: string; exitCode: number; stderr: string }
> {
	try {
		// First, check which plugins are installed
		const pluginListResult = await executeCommand("dokku plugin:list");

		if (pluginListResult.exitCode !== 0) {
			return {
				error: "Failed to list plugins",
				command: pluginListResult.command,
				exitCode: pluginListResult.exitCode,
				stderr: pluginListResult.stderr,
			};
		}

		const installedPlugins: string[] = [];
		const lines = pluginListResult.stdout.split("\n").filter((line) => line.trim());

		for (const line of lines) {
			// Check if any supported plugin is in the line
			for (const plugin of SUPPORTED_PLUGINS) {
				if (line.includes(plugin)) {
					installedPlugins.push(plugin);
					break;
				}
			}
		}

		if (installedPlugins.length === 0) {
			return [];
		}

		// Fetch all plugins' databases in parallel
		const pluginResults = await Promise.all(
			installedPlugins.map(async (plugin) => {
				const listResult = await executeCommand(`dokku ${plugin}:list`);
				if (listResult.exitCode !== 0) return [];

				const dbLines = listResult.stdout.split("\n").filter((line) => line.trim());

				const dbs = await Promise.all(
					dbLines.map(async (dbName) => {
						const linkReportResult = await executeCommand(`dokku ${plugin}:links ${dbName}`);

						let linkedApps: string[] = [];
						if (linkReportResult.exitCode === 0) {
							const linkLines = linkReportResult.stdout
								.split("\n")
								.filter((line) => line.trim());
							for (const line of linkLines) {
								if (line.includes("linked apps")) {
									const match = line.match(/linked apps:\s*(.+)/);
									if (match) {
										linkedApps = match[1].split(",").map((app) => app.trim());
									}
								}
							}
						}

						let connectionInfo = "";
						if (plugin === "postgres") {
							connectionInfo = `postgresql://${dbName}@localhost`;
						} else if (plugin === "mysql" || plugin === "mariadb") {
							connectionInfo = `mysql://${dbName}@localhost`;
						} else if (plugin === "redis") {
							connectionInfo = `redis://localhost:6379`;
						} else if (plugin === "mongo") {
							connectionInfo = `mongodb://localhost`;
						}

						return { name: dbName, plugin, linkedApps, connectionInfo };
					})
				);

				return dbs;
			})
		);

		return pluginResults.flat();
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: "dokku plugin:list",
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function createDatabase(
	plugin: string,
	name: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	// Validate plugin
	if (!SUPPORTED_PLUGINS.includes(plugin as (typeof SUPPORTED_PLUGINS)[number])) {
		return {
			error: "Invalid database plugin",
			command: "",
			exitCode: 400,
		};
	}

	// Validate database name
	if (!name || name.trim().length === 0) {
		return {
			error: "Database name cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// Sanitize database name (no shell characters)
	const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "");

	if (sanitizedName !== name) {
		return {
			error: "Database name contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku ${plugin}:create ${sanitizedName}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ${plugin}:create ${sanitizedName}`,
			exitCode: 1,
		};
	}
}

export async function linkDatabase(
	plugin: string,
	name: string,
	app: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	// Validate plugin
	if (!SUPPORTED_PLUGINS.includes(plugin as (typeof SUPPORTED_PLUGINS)[number])) {
		return {
			error: "Invalid database plugin",
			command: "",
			exitCode: 400,
		};
	}

	// Validate database name
	if (!name || name.trim().length === 0) {
		return {
			error: "Database name cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// Validate app name
	if (!app || app.trim().length === 0) {
		return {
			error: "App name cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// Sanitize names
	const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "");
	const sanitizedApp = app.replace(/[^a-zA-Z0-9_-]/g, "");

	if (sanitizedName !== name || sanitizedApp !== app) {
		return {
			error: "Database name or app name contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku ${plugin}:link ${sanitizedName} ${sanitizedApp}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ${plugin}:link ${sanitizedName} ${sanitizedApp}`,
			exitCode: 1,
		};
	}
}

export async function unlinkDatabase(
	plugin: string,
	name: string,
	app: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	// Validate plugin
	if (!SUPPORTED_PLUGINS.includes(plugin as (typeof SUPPORTED_PLUGINS)[number])) {
		return {
			error: "Invalid database plugin",
			command: "",
			exitCode: 400,
		};
	}

	// Validate database name
	if (!name || name.trim().length === 0) {
		return {
			error: "Database name cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// Validate app name
	if (!app || app.trim().length === 0) {
		return {
			error: "App name cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// Sanitize names
	const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "");
	const sanitizedApp = app.replace(/[^a-zA-Z0-9_-]/g, "");

	if (sanitizedName !== name || sanitizedApp !== app) {
		return {
			error: "Database name or app name contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku ${plugin}:unlink ${sanitizedName} ${sanitizedApp}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ${plugin}:unlink ${sanitizedName} ${sanitizedApp}`,
			exitCode: 1,
		};
	}
}

export async function destroyDatabase(
	plugin: string,
	name: string,
	confirmName: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	// Validate plugin
	if (!SUPPORTED_PLUGINS.includes(plugin as (typeof SUPPORTED_PLUGINS)[number])) {
		return {
			error: "Invalid database plugin",
			command: "",
			exitCode: 400,
		};
	}

	// Validate database name
	if (!name || name.trim().length === 0) {
		return {
			error: "Database name cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// Validate confirmation
	if (!confirmName || confirmName !== name) {
		return {
			error: "Confirmation name does not match database name",
			command: "",
			exitCode: 400,
		};
	}

	// Sanitize database name
	const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "");

	if (sanitizedName !== name) {
		return {
			error: "Database name contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku ${plugin}:destroy ${sanitizedName} --force`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ${plugin}:destroy ${sanitizedName} --force`,
			exitCode: 1,
		};
	}
}
