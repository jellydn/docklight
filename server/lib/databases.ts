import { executeCommand, type CommandResult } from "./executor.js";
import { DokkuCommands } from "./dokku.js";
import { logger } from "./logger.js";

export interface Database {
	name: string;
	plugin: string;
	linkedApps: string[];
	connectionInfo: string;
}

// List of supported database plugins
const SUPPORTED_PLUGINS = ["postgres", "redis", "mysql", "mariadb", "mongo"] as const;
type SupportedPlugin = (typeof SUPPORTED_PLUGINS)[number];

export function parseInstalledPlugins(pluginListOutput: string): SupportedPlugin[] {
	const installedPlugins = new Set<SupportedPlugin>();
	const lines = pluginListOutput.split("\n").filter((line) => line.trim());

	for (const line of lines) {
		const lowerLine = line.toLowerCase();
		for (const plugin of SUPPORTED_PLUGINS) {
			const pluginPattern = new RegExp(`\\b(?:dokku-)?${plugin}\\b`, "i");
			if (pluginPattern.test(lowerLine)) {
				installedPlugins.add(plugin);
			}
		}
	}

	if (installedPlugins.size === 0 && pluginListOutput.trim()) {
		logger.warn(
			{ pluginListOutput },
			"parseInstalledPlugins: no supported database plugins found in output"
		);
	}

	return [...installedPlugins];
}

async function getInstalledPlugins(): Promise<
	| { plugins: SupportedPlugin[] }
	| { error: string; command: string; exitCode: number; stderr: string }
> {
	const pluginListResult = await executeCommand(DokkuCommands.pluginList());

	if (pluginListResult.exitCode !== 0) {
		return {
			error: "Failed to list plugins",
			command: pluginListResult.command,
			exitCode: pluginListResult.exitCode,
			stderr: pluginListResult.stderr,
		};
	}

	return { plugins: parseInstalledPlugins(pluginListResult.stdout) };
}

export function parseLinkedApps(output: string): string[] {
	const lines = output.split("\n");
	let collecting = false;
	const apps: string[] = [];
	for (const line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;
		const lowerLine = trimmedLine.toLowerCase();
		if (lowerLine.includes("linked apps") || lowerLine.includes("links:")) {
			const inlineMatch = trimmedLine.match(/(?:linked apps|Links):\s*(.+)/i);
			if (inlineMatch) {
				const appsStr = inlineMatch[1].trim().toLowerCase();
				if (appsStr && appsStr !== "no linked apps" && appsStr !== "-") {
					return appsStr.split(/[,\s]+/).filter(Boolean);
				}
				collecting = false;
			} else {
				collecting = true;
			}
			continue;
		}
		if (collecting) {
			if (trimmedLine.startsWith("=====>")) break;
			apps.push(trimmedLine.toLowerCase());
		}
	}

	const hasLinkedContent =
		/linked\s+apps|links:/i.test(output) && apps.length === 0 && output.trim();
	if (hasLinkedContent) {
		logger.warn({ output }, "parseLinkedApps: linked apps content detected but result is empty");
	}

	return apps;
}

export async function getDatabases(): Promise<
	Database[] | { error: string; command: string; exitCode: number; stderr: string }
> {
	const fallbackCommand = DokkuCommands.pluginList();

	try {
		const installedPluginsResult = await getInstalledPlugins();
		if ("error" in installedPluginsResult) {
			return installedPluginsResult;
		}

		const installedPlugins = installedPluginsResult.plugins;
		if (installedPlugins.length === 0) {
			return [];
		}

		// Fetch all plugins' databases in parallel
		const pluginResults = await Promise.all(
			installedPlugins.map(async (plugin) => {
				const listResult = await executeCommand(DokkuCommands.dbList(plugin));
				if (listResult.exitCode !== 0) return [];

				const dbLines = listResult.stdout
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line && !line.startsWith("=====>"));

				const dbs = await Promise.all(
					dbLines.map(async (dbName) => {
						const linkReportResult = await executeCommand(DokkuCommands.dbLinks(plugin, dbName));
						const infoReportResult = await executeCommand(DokkuCommands.dbInfo(plugin, dbName));

						let linkedApps: string[] = [];

						if (linkReportResult.exitCode === 0) {
							linkedApps = parseLinkedApps(linkReportResult.stdout);
						}

						if (linkedApps.length === 0 && infoReportResult.exitCode === 0) {
							linkedApps = parseLinkedApps(infoReportResult.stdout);
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
			command: fallbackCommand,
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
	if (!SUPPORTED_PLUGINS.includes(plugin as SupportedPlugin)) {
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

	const command = DokkuCommands.dbCreate(plugin, sanitizedName);

	try {
		const installedPluginsResult = await getInstalledPlugins();
		if ("error" in installedPluginsResult) {
			return {
				error: "Failed to verify installed plugins before creating database",
				command: installedPluginsResult.command,
				exitCode: installedPluginsResult.exitCode,
				stderr: installedPluginsResult.stderr,
			};
		}

		if (!installedPluginsResult.plugins.includes(plugin as SupportedPlugin)) {
			const installed = installedPluginsResult.plugins.length
				? installedPluginsResult.plugins.join(", ")
				: "none";
			return {
				error: `Database plugin '${plugin}' is not installed`,
				command: DokkuCommands.pluginList(),
				exitCode: 400,
				stderr: `Installed database plugins: ${installed}`,
			};
		}

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

	const command = DokkuCommands.dbLink(plugin, sanitizedName, sanitizedApp);

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

	const command = DokkuCommands.dbUnlink(plugin, sanitizedName, sanitizedApp);

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

	const command = DokkuCommands.dbDestroy(plugin, sanitizedName);

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
