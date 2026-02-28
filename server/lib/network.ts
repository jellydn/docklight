import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";

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

	const command = DokkuCommands.networkReport(name);

	try {
		const result = await executeCommand(command);

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
				const regex = new RegExp(`^\\s*${prop}:\\s*(.*)$`, "i");
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
			command,
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

	const command = DokkuCommands.networkSet(name, key, value);

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

	const command = DokkuCommands.networkSet(name, key);

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
