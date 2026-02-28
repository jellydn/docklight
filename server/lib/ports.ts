import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";

export interface PortMapping {
	scheme: string;
	hostPort: number;
	containerPort: number;
}

function createPortError(message: string): { error: string; command: string; exitCode: number } {
	return {
		error: message,
		command: "",
		exitCode: 400,
	};
}

function validatePort(port: number): string | null {
	if (typeof port !== "number" || port < 1 || port > 65535) {
		return "Port must be a number between 1 and 65535";
	}
	return null;
}

function validateScheme(scheme: string): string | null {
	const validSchemes = ["http", "https", "tcp"];
	if (!validSchemes.includes(scheme.toLowerCase())) {
		return "Scheme must be http, https, or tcp";
	}
	return null;
}

export async function getPorts(
	name: string
): Promise<PortMapping[] | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		const result = await executeCommand(DokkuCommands.portsReport(name));

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get ports",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const ports: PortMapping[] = [];
		const lines = result.stdout.split("\n").map((line) => stripAnsi(line));

		for (const line of lines) {
			const mapMatch = line.match(/ports\s+map:\s+(.+)/i);
			if (mapMatch) {
				const mappings = mapMatch[1].trim().split(/\s+/);
				for (const mapping of mappings) {
					const match = mapping.match(/^(http|https|tcp):(\d+):(\d+)$/);
					if (match) {
						ports.push({
							scheme: match[1],
							hostPort: Number.parseInt(match[2], 10),
							containerPort: Number.parseInt(match[3], 10),
						});
					}
				}
			}
		}

		return ports;
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.portsReport(name),
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function addPort(
	name: string,
	scheme: string,
	hostPort: number,
	containerPort: number
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createPortError("Invalid app name");
	}

	const schemeValidationError = validateScheme(scheme);
	if (schemeValidationError) {
		return createPortError(schemeValidationError);
	}

	const portValidationError = validatePort(hostPort);
	if (portValidationError) {
		return createPortError(portValidationError);
	}

	const containerPortValidationError = validatePort(containerPort);
	if (containerPortValidationError) {
		return createPortError(containerPortValidationError);
	}

	try {
		return executeCommand(DokkuCommands.portsAdd(name, scheme, hostPort, containerPort));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.portsAdd(name, scheme, hostPort, containerPort),
			exitCode: 1,
		};
	}
}

export async function removePort(
	name: string,
	scheme: string,
	hostPort: number,
	containerPort: number
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createPortError("Invalid app name");
	}

	const schemeValidationError = validateScheme(scheme);
	if (schemeValidationError) {
		return createPortError(schemeValidationError);
	}

	const portValidationError = validatePort(hostPort);
	if (portValidationError) {
		return createPortError(portValidationError);
	}

	const containerPortValidationError = validatePort(containerPort);
	if (containerPortValidationError) {
		return createPortError(containerPortValidationError);
	}

	try {
		return executeCommand(DokkuCommands.portsRemove(name, scheme, hostPort, containerPort));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.portsRemove(name, scheme, hostPort, containerPort),
			exitCode: 1,
		};
	}
}

export async function clearPorts(
	name: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createPortError("Invalid app name");
	}

	try {
		return executeCommand(DokkuCommands.portsClear(name));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.portsClear(name),
			exitCode: 1,
		};
	}
}

export interface ProxyReport {
	enabled: boolean;
	type: string;
}

export async function getProxyReport(
	name: string
): Promise<ProxyReport | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		const result = await executeCommand(DokkuCommands.proxyReport(name));

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get proxy report",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const lines = result.stdout.split("\n").map((line) => stripAnsi(line));
		let enabled = false;
		let proxyType = "unknown";

		for (const line of lines) {
			const enabledMatch = line.match(/proxy\s+enabled:\s*(\w+)/i);
			if (enabledMatch) {
				enabled = enabledMatch[1].toLowerCase() === "true";
			}

			const computedTypeMatch = line.match(/proxy\s+computed\s+type:\s*(\w+)/i);
			if (computedTypeMatch) {
				proxyType = computedTypeMatch[1];
			}
		}

		return { enabled, type: proxyType };
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.proxyReport(name),
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function enableProxy(
	name: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(DokkuCommands.proxyEnable(name));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.proxyEnable(name),
			exitCode: 1,
		};
	}
}

export async function disableProxy(
	name: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(DokkuCommands.proxyDisable(name));
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: DokkuCommands.proxyDisable(name),
			exitCode: 1,
		};
	}
}
