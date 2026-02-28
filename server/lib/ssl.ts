import { executeCommand, type CommandResult } from "./executor.js";
import { isValidAppName } from "./apps.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";

const INVALID_NAME_ERROR = {
	error: "Invalid app name",
	command: "",
	exitCode: 400,
	stderr: "App name must contain only lowercase letters, numbers, and hyphens",
};

export interface SSLStatus {
	active: boolean;
	expiryDate?: string;
	certProvider?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
	return EMAIL_PATTERN.test(email);
}

function parseReportLine(line: string): { key: string; value: string } | null {
	const clean = stripAnsi(line).trim();
	const separatorIndex = clean.indexOf(":");
	if (separatorIndex <= 0) {
		return null;
	}

	return {
		key: clean.slice(0, separatorIndex).trim().toLowerCase(),
		value: clean.slice(separatorIndex + 1).trim(),
	};
}

function parseBoolean(value: string): boolean | null {
	const normalized = value.trim().toLowerCase();
	if (normalized === "true") {
		return true;
	}
	if (normalized === "false") {
		return false;
	}
	return null;
}

function extractExpiry(value: string): string | undefined {
	const dateMatch = value.match(/\d{4}-\d{2}-\d{2}/);
	return dateMatch?.[0];
}

function parseLetsencryptReport(stdout: string): SSLStatus | null {
	let active: boolean | null = null;
	let expiryDate: string | undefined;

	for (const line of stdout.split("\n")) {
		const parsed = parseReportLine(line);
		if (!parsed) {
			continue;
		}

		const { key, value } = parsed;
		const boolValue = parseBoolean(value);
		if (boolValue !== null && /(enabled|active|exists|registered)/.test(key)) {
			active = boolValue;
		}

		if (/(expires|expiry|not after|expiration)/.test(key)) {
			expiryDate = extractExpiry(value) || expiryDate;
		}
	}

	if (active === null) {
		return null;
	}

	return {
		active,
		certProvider: "letsencrypt",
		expiryDate,
	};
}

function parseCertsReport(stdout: string): SSLStatus | null {
	let active: boolean | null = null;
	let expiryDate: string | undefined;
	let hasCertEvidence = false;

	for (const line of stdout.split("\n")) {
		const parsed = parseReportLine(line);
		if (!parsed) {
			continue;
		}

		const { key, value } = parsed;
		const boolValue = parseBoolean(value);
		if (
			boolValue !== null &&
			/(ssl.*enabled|certificate.*enabled|certificates.*enabled)/.test(key)
		) {
			active = boolValue;
		}

		if (/(issuer|subject|not before|not after|certificate)/.test(key) && value !== "") {
			hasCertEvidence = true;
		}

		if (/(expires|expiry|not after|expiration)/.test(key)) {
			expiryDate = extractExpiry(value) || expiryDate;
		}
	}

	if (active === null && !hasCertEvidence) {
		return null;
	}

	return {
		active: active ?? hasCertEvidence,
		certProvider: "custom",
		expiryDate,
	};
}

function parseLetsencryptList(stdout: string, appName: string): SSLStatus | null {
	const lines = stdout.split("\n").map((line) => stripAnsi(line).trim());
	for (const line of lines) {
		if (!line.toLowerCase().includes(appName.toLowerCase())) {
			continue;
		}

		const parts = line.split(/\s+/).filter((part) => part.length > 0);
		if (parts.length === 0) {
			continue;
		}

		const expiryDate = parts
			.map((part) => extractExpiry(part))
			.find((value): value is string => Boolean(value));

		return {
			active: true,
			certProvider: "letsencrypt",
			expiryDate,
		};
	}

	return null;
}

export async function getSSL(
	appName: string
): Promise<SSLStatus | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(appName)) {
		return INVALID_NAME_ERROR;
	}

	const fallbackCommand = DokkuCommands.letsencryptLs();

	try {
		const letsencryptReportResult = await executeCommand(DokkuCommands.letsencryptReport(appName));
		if (letsencryptReportResult.exitCode === 0) {
			const reportStatus = parseLetsencryptReport(letsencryptReportResult.stdout);
			if (reportStatus) {
				return reportStatus;
			}
		}

		const letsencryptResult = await executeCommand(fallbackCommand);

		if (letsencryptResult.exitCode === 0) {
			const listStatus = parseLetsencryptList(letsencryptResult.stdout, appName);
			if (listStatus) {
				return listStatus;
			}
		}

		const certsResult = await executeCommand(DokkuCommands.certsReport(appName));

		if (certsResult.exitCode === 0) {
			const certsStatus = parseCertsReport(certsResult.stdout);
			if (certsStatus) {
				return certsStatus;
			}
		}

		return { active: false };
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

export async function enableSSL(
	appName: string,
	email?: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(appName)) {
		return { error: "Invalid app name", exitCode: 400, command: "" };
	}

	const normalizedEmail = typeof email === "string" ? email.trim() : "";
	if (normalizedEmail.length > 0) {
		if (!isValidEmail(normalizedEmail)) {
			return {
				error: "Invalid email address",
				command: "",
				exitCode: 400,
			};
		}

		const setEmailResult = await executeCommand(
			DokkuCommands.letsencryptSetEmail(appName, normalizedEmail)
		);
		if (setEmailResult.exitCode !== 0) {
			return setEmailResult;
		}
	}

	return executeCommand(DokkuCommands.letsencryptEnable(appName));
}

export async function renewSSL(
	appName: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(appName)) {
		return { error: "Invalid app name", exitCode: 400, command: "" };
	}

	return executeCommand(DokkuCommands.letsencryptAutoRenew(appName));
}
