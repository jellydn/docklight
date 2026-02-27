import { executeCommand, CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";

export async function getDomains(
	name: string
): Promise<string[] | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		const result = await executeCommand(`dokku domains:report ${name}`);

		if (result.exitCode !== 0) {
			return {
				error: "Failed to get domains",
				command: result.command,
				exitCode: result.exitCode,
				stderr: result.stderr,
			};
		}

		const domains: string[] = [];
		const lines = result.stdout.split("\n");

		for (const line of lines) {
			if (line.includes("domains vhosts")) {
				const match = line.match(/:\s*(.+)/);
				if (match) {
					const domainList = match[1].split(" ").filter((d) => d.length > 0);
					domains.push(...domainList);
				}
			}
		}

		return domains;
	} catch (error: any) {
		return {
			error: error.message || "Unknown error occurred",
			command: `dokku domains:report ${name}`,
			exitCode: 1,
			stderr: error.message || "",
		};
	}
}

export async function addDomain(
	name: string,
	domain: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	// Basic domain format validation and sanitization
	const sanitizedDomain = domain.trim();

	if (!sanitizedDomain || sanitizedDomain.length === 0) {
		return {
			error: "Domain cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// Basic format check (allow letters, numbers, hyphens, and dots)
	if (!/^[a-zA-Z0-9.-]+$/.test(sanitizedDomain)) {
		return {
			error: "Invalid domain format",
			command: "",
			exitCode: 400,
		};
	}

	// No shell characters
	if (/[;&$()|<>`'"\\]/.test(sanitizedDomain)) {
		return {
			error: "Domain contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku domains:add ${name} ${sanitizedDomain}`);
	} catch (error: any) {
		return {
			error: error.message || "Unknown error occurred",
			command: `dokku domains:add ${name} ${sanitizedDomain}`,
			exitCode: 1,
		};
	}
}

export async function removeDomain(
	name: string,
	domain: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	// Basic domain format validation and sanitization
	const sanitizedDomain = domain.trim();

	if (!sanitizedDomain || sanitizedDomain.length === 0) {
		return {
			error: "Domain cannot be empty",
			command: "",
			exitCode: 400,
		};
	}

	// No shell characters
	if (/[;&$()|<>`'"\\]/.test(sanitizedDomain)) {
		return {
			error: "Domain contains invalid characters",
			command: "",
			exitCode: 400,
		};
	}

	try {
		return executeCommand(`dokku domains:remove ${name} ${sanitizedDomain}`);
	} catch (error: any) {
		return {
			error: error.message || "Unknown error occurred",
			command: `dokku domains:remove ${name} ${sanitizedDomain}`,
			exitCode: 1,
		};
	}
}
