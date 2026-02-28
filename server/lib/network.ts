import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";

export interface NetworkReport {
	"attach-post-create": string;
	"attach-post-deploy": string;
	"bind-all-interfaces": string;
	"initial-network": string;
	"static-web-listener": string;
	"tls-internal": string;
}

const NETWORK_PROPERTIES = [
	"attach-post-create",
	"attach-post-deploy",
	"bind-all-interfaces",
	"initial-network",
	"static-web-listener",
	"tls-internal",
] as const;

type NetworkProperty = (typeof NETWORK_PROPERTIES)[number];

function createNetworkError(message: string): {
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

function isValidNetworkProperty(key: string): key is NetworkProperty {
	return NETWORK_PROPERTIES.includes(key as NetworkProperty);
}

export async function getNetworkReport(
	name: string
): Promise<NetworkReport | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		const result = await executeCommand(`dokku network:report ${name}`);

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get network report",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const report: NetworkReport = {
			"attach-post-create": "",
			"attach-post-deploy": "",
			"bind-all-interfaces": "",
			"initial-network": "",
			"static-web-listener": "",
			"tls-internal": "",
		};

		const lines = result.stdout.split("\n").map((line) => stripAnsi(line));

		for (const line of lines) {
			for (const prop of NETWORK_PROPERTIES) {
				const regex = new RegExp(`^\\s*${prop.replace(/-/g, "(?:.*-)*")}:\\s*(.*)$`, "i");
				const match = line.match(regex);
				if (match) {
					report[prop] = match[1]?.trim() ?? "";
				}
			}
		}

		return report;
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku network:report ${name}`,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function setNetworkProperty(
	name: string,
	key: string,
	value: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createNetworkError("Invalid app name");
	}

	if (!isValidNetworkProperty(key)) {
		return createNetworkError(
			`Invalid network property. Must be one of: ${NETWORK_PROPERTIES.join(", ")}`
		);
	}

	try {
		if (value === "") {
			return executeCommand(`dokku network:set ${name} ${key}`);
		}
		return executeCommand(`dokku network:set ${name} ${key} ${value}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku network:set ${name} ${key} ${value}`,
			exitCode: 1,
		};
	}
}

export async function clearNetworkProperty(
	name: string,
	key: string
): Promise<CommandResult | { error: string; command: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createNetworkError("Invalid app name");
	}

	if (!isValidNetworkProperty(key)) {
		return createNetworkError(
			`Invalid network property. Must be one of: ${NETWORK_PROPERTIES.join(", ")}`
		);
	}

	try {
		return executeCommand(`dokku network:set ${name} ${key}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku network:set ${name} ${key}`,
			exitCode: 1,
		};
	}
}
