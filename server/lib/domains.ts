import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";

interface ValidationError {
	error: string;
	command: string;
	exitCode: number;
}

function createDomainError(message: string): ValidationError {
	return {
		error: message,
		command: "",
		exitCode: 400,
	};
}

function isValidDomain(domain: string): boolean {
	const sanitizedDomain = domain.trim();

	if (!sanitizedDomain || sanitizedDomain.length === 0) {
		return false;
	}

	if (!/^[a-zA-Z0-9.-]+$/.test(sanitizedDomain)) {
		return false;
	}

	if (/[;&$()|<>`'"\\]/.test(sanitizedDomain)) {
		return false;
	}

	return true;
}

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

		const domains = new Set<string>();
		const lines = result.stdout.split("\n").map((line) => stripAnsi(line));

		for (const line of lines) {
			const vhostsMatch = line.match(/domains(?:\s+app)?\s+vhosts:\s*(.+)$/i);
			if (!vhostsMatch) {
				continue;
			}

			const domainList = vhostsMatch[1]
				.split(/\s+/)
				.map((domain) => domain.trim())
				.filter(
					(domain) => domain.length > 0 && domain !== "-" && domain.toLowerCase() !== "(none)"
				);

			for (const domain of domainList) {
				domains.add(domain);
			}
		}

		return [...domains];
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku domains:report ${name}`,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

export async function addDomain(
	name: string,
	domain: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return createDomainError("Invalid app name");
	}

	if (!isValidDomain(domain)) {
		const sanitizedDomain = domain.trim();
		if (!sanitizedDomain) return createDomainError("Domain cannot be empty");
		if (!/^[a-zA-Z0-9.-]+$/.test(sanitizedDomain)) return createDomainError("Invalid domain format");
		return createDomainError("Domain contains invalid characters");
	}

	const sanitizedDomain = domain.trim();

	try {
		return executeCommand(`dokku domains:add ${name} ${sanitizedDomain}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
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
		return createDomainError("Invalid app name");
	}

	if (!isValidDomain(domain)) {
		const sanitizedDomain = domain.trim();
		if (!sanitizedDomain) return createDomainError("Domain cannot be empty");
		if (!/^[a-zA-Z0-9.-]+$/.test(sanitizedDomain)) return createDomainError("Invalid domain format");
		return createDomainError("Domain contains invalid characters");
	}

	const sanitizedDomain = domain.trim();

	try {
		return executeCommand(`dokku domains:remove ${name} ${sanitizedDomain}`);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: `dokku domains:remove ${name} ${sanitizedDomain}`,
			exitCode: 1,
		};
	}
}
