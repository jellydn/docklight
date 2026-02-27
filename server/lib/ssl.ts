import { executeCommand, CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";

export interface SSLStatus {
	active: boolean;
	expiryDate?: string;
	certProvider?: string;
}

export async function getSSL(
	appName: string
): Promise<SSLStatus | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(appName)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		// Try letsencrypt:ls first
		const letsencryptResult = await executeCommand("dokku letsencrypt:ls");

		if (letsencryptResult.exitCode === 0) {
			const lines = letsencryptResult.stdout.split("\n");
			for (const line of lines) {
				if (line.includes(appName)) {
					// Parse SSL status from letsencrypt output
					const parts = line.split(/\s+/).filter((p) => p.length > 0);
					if (parts.length >= 3) {
						return {
							active: true,
							certProvider: "letsencrypt",
							expiryDate: parts[2] || undefined,
						};
					}
				}
			}
		}

		// Fall back to certs:report
		const certsResult = await executeCommand(`dokku certs:report ${appName}`);

		if (certsResult.exitCode === 0) {
			const lines = certsResult.stdout.split("\n");
			for (const line of lines) {
				if (line.includes("ssl enabled")) {
					const match = line.match(/:\s*(.+)/);
					if (match && match[1].includes("true")) {
						return {
							active: true,
							certProvider: "custom",
						};
					}
				}
			}
		}

		return { active: false };
	} catch (error: any) {
		return {
			error: error.message || "Unknown error occurred",
			command: `dokku letsencrypt:ls`,
			exitCode: 1,
			stderr: error.message || "",
		};
	}
}

export async function enableSSL(
	appName: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(appName)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	return executeCommand(`dokku letsencrypt:enable ${appName}`);
}

export async function renewSSL(
	appName: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(appName)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	return executeCommand(`dokku letsencrypt:auto-renew ${appName}`);
}
