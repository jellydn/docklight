import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";

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
		const result = await executeCommand(`dokku ports:report ${name}`);

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
			const portInfoMatch = line.match(/port info:\s*(.+)$/i);
			if (!portInfoMatch) {
				continue;
			}

			const portInfo = portInfoMatch[1].trim();
			const httpMatch = portInfo.match(/http\s+(\d+):(\d+)/i);
			const httpsMatch = portInfo.match(/https\s+(\d+):(\d+)/i);
			const tcpMatch = portInfo.match(/tcp\s+(\d+):(\d+)/i);

			if (httpMatch) {
				ports.push({
					scheme: "http",
					hostPort: Number.parseInt(httpMatch[1], 10),
					containerPort: Number.parseInt(httpMatch[2], 10),
				});
			}

			if (httpsMatch) {
				ports.push({
					scheme: "https",
					hostPort: Number.parseInt(httpsMatch[1], 10),
					containerPort: Number.parseInt(httpsMatch[2], 10),
				});
			}

			if (tcpMatch) {
				ports.push({
					scheme: "tcp",
					hostPort: Number.parseInt(tcpMatch[1], 10),
					containerPort: Number.parseInt(tcpMatch[2], 10),
				});
			}
		}

		return ports;
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ports:report ${name}`,
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
		return executeCommand(`dokku ports:add ${name} ${scheme}:${hostPort}:${containerPort}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ports:add ${name} ${scheme}:${hostPort}:${containerPort}`,
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
		return executeCommand(`dokku ports:remove ${name} ${scheme}:${hostPort}:${containerPort}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ports:remove ${name} ${scheme}:${hostPort}:${containerPort}`,
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
		return executeCommand(`dokku ports:clear ${name}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku ports:clear ${name}`,
			exitCode: 1,
		};
	}
}
