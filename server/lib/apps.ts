import { type CommandResult, executeCommand } from "./executor.js";
import { stripAnsi } from "./ansi.js";
import { DokkuCommands } from "./dokku.js";

export interface App {
	name: string;
	status: "running" | "stopped";
	domains: string[];
	lastDeployTime?: string;
}

export interface AppDetail {
	name: string;
	status: "running" | "stopped";
	gitRemote: string;
	domains: string[];
	processes: Record<string, number>;
	canScale: boolean;
}

const UNKNOWN_ERROR = "Unknown error";
const INVALID_NAME_ERROR = {
	error: "Invalid app name",
	command: "",
	exitCode: 400,
	stderr: "App name must contain only lowercase letters, numbers, and hyphens.",
};

function withRuntimeHint(command: string, stderr: string): string {
	const lowerStderr = stderr.toLowerCase();
	const lowerCommand = command.toLowerCase();
	if (lowerCommand.includes("dokku") && lowerStderr.includes("not found")) {
		return `${stderr}. Dokku CLI is unavailable in this runtime`;
	}
	return stderr;
}

function createValidationError(commandName: string): typeof INVALID_NAME_ERROR {
	return { ...INVALID_NAME_ERROR, command: `${commandName}-validation` };
}

export async function getApps(
	userId?: string
): Promise<App[] | { error: string; command: string; exitCode: number; stderr: string }> {
	const fallbackCommand = DokkuCommands.appsList();

	try {
		const listCommands = [DokkuCommands.appsListQuiet(), DokkuCommands.appsList()];
		let listResult: CommandResult | undefined;

		for (const command of listCommands) {
			const result = await executeCommand(command, 30000, { userId });
			if (result.exitCode === 0) {
				return await fetchAppDetails(result.stdout, userId);
			}
			listResult = result;
		}

		return {
			error: "Failed to list apps",
			command: listResult?.command || fallbackCommand,
			exitCode: listResult?.exitCode || 1,
			stderr: withRuntimeHint(
				listResult?.command || fallbackCommand,
				listResult?.stderr || UNKNOWN_ERROR
			),
		};
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || UNKNOWN_ERROR,
			command: fallbackCommand,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

async function fetchAppDetails(stdout: string, userId?: string): Promise<App[]> {
	const appNames = stdout
		.split("\n")
		.map((line) => stripAnsi(line).trim())
		.filter(isValidAppName);

	if (appNames.length === 0) {
		return [];
	}

	const MAX_CONCURRENT = 2;
	const semaphore = { count: 0, queue: [] as (() => void)[] };
	const results: (App | null)[] = new Array(appNames.length).fill(null);

	const acquire = (): Promise<void> => {
		return new Promise((resolve) => {
			if (semaphore.count < MAX_CONCURRENT) {
				semaphore.count++;
				resolve();
			} else {
				semaphore.queue.push(resolve);
			}
		});
	};

	const release = (): void => {
		const next = semaphore.queue.shift();
		if (next) {
			next();
		} else {
			semaphore.count--;
		}
	};

	const fetchApp = async (appName: string, idx: number): Promise<void> => {
		await acquire();
		try {
			const [psResult, domainsResult, gitResult] = await Promise.all([
				executeCommand(DokkuCommands.psReport(appName), 30000, { userId }),
				executeCommand(DokkuCommands.domainsReport(appName), 30000, { userId }),
				executeCommand(DokkuCommands.gitReport(appName), 30000, { userId }),
			]);

			results[idx] = {
				name: appName,
				status: psResult.exitCode === 0 ? parseStatus(psResult.stdout) : "stopped",
				domains: domainsResult.exitCode === 0 ? parseDomains(domainsResult.stdout) : [],
				lastDeployTime:
					gitResult.exitCode === 0
						? toISODateTime(parseLastUpdatedAt(gitResult.stdout))
						: undefined,
			};
		} finally {
			release();
		}
	};

	await Promise.all(appNames.map((appName, idx) => fetchApp(appName, idx)));

	return results.filter((r): r is App => r !== null);
}

export function parseStatus(stdout: string): "running" | "stopped" {
	const lines = stdout.split("\n").map((line) => stripAnsi(line));
	let sawProcessStatus = false;
	let sawRunningProcess = false;

	for (const line of lines) {
		const stateMatch = line.match(/deployed state:\s*(running|stopped)/i);
		if (stateMatch) {
			const status = stateMatch[1].toLowerCase();
			if (status === "running" || status === "stopped") {
				return status;
			}
		}

		const processStatusMatch = line.match(/status\s+[a-z0-9-]+\s+\d+:\s*(running|stopped)/i);
		if (processStatusMatch) {
			sawProcessStatus = true;
			if (processStatusMatch[1].toLowerCase() === "running") {
				sawRunningProcess = true;
			}
			continue;
		}

		const keyValueMatch = line.match(/^[^:]+:\s*(.+)$/);
		if (!keyValueMatch) {
			continue;
		}

		const key = line.slice(0, line.indexOf(":")).toLowerCase();
		const value = keyValueMatch[1].trim().toLowerCase();
		const isBooleanValue = value === "true" || value === "false";
		if (!isBooleanValue) {
			continue;
		}

		const isRunningKey = /\brunning\b/.test(key);
		if (isRunningKey) {
			return value === "true" ? "running" : "stopped";
		}
	}

	if (sawProcessStatus) {
		return sawRunningProcess ? "running" : "stopped";
	}

	return "stopped";
}

function parseLastUpdatedAt(stdout: string): string | undefined {
	const lines = stdout.split("\n").map((line) => stripAnsi(line));
	for (const line of lines) {
		const match = line.match(/^\s*Git last updated at:\s*(.+)$/i);
		if (match) {
			return match[1].trim() || undefined;
		}
	}
	return undefined;
}

export function toISODateTime(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim();
	if (!trimmed) return undefined;

	if (/^\d{9,10}$/.test(trimmed)) {
		const date = new Date(Number(trimmed) * 1000);
		if (!Number.isNaN(date.getTime())) return date.toISOString();
	}

	const hasTimezone = /[+-]\d{2}:?\d{2}$|Z$/i.test(trimmed) || trimmed.includes("T");
	const input = hasTimezone ? trimmed : `${trimmed.replace(" ", "T")}Z`;
	const date = new Date(input);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toISOString();
}

export function parseDomains(stdout: string): string[] {
	const lines = stdout.split("\n").map((line) => stripAnsi(line));

	const appEnabled = lines.some((line) => /domains\s+app\s+enabled:\s*true/i.test(line));

	if (!appEnabled) {
		return [];
	}

	const domains = new Set<string>();

	for (const line of lines) {
		const vhostsMatch = line.match(/domains\s+app\s+vhosts:\s*(.+)$/i);
		if (!vhostsMatch) {
			continue;
		}

		const values = vhostsMatch[1]
			.split(/\s+/)
			.map((domain) => domain.trim())
			.filter((domain) => domain.length > 0 && domain !== "-" && domain.toLowerCase() !== "(none)");

		for (const value of values) {
			domains.add(value);
		}
	}

	return [...domains];
}

export const MAX_APP_NAME_LENGTH = 64;

export function isValidAppName(name: string): boolean {
	// Must be 1-64 chars, lowercase letters, numbers, hyphens only
	// Cannot start or end with a hyphen (DNS label rules)
	if (!name || name.length > MAX_APP_NAME_LENGTH || name.length < 1) {
		return false;
	}
	if (name.startsWith("-") || name.endsWith("-")) {
		return false;
	}
	return /^[a-z0-9-]+$/.test(name);
}

export async function getAppDetail(
	name: string,
	userId?: string
): Promise<AppDetail | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("get-app-detail");
	}

	const psReportCommand = DokkuCommands.psReport(name);

	try {
		const psReportResult = await executeCommand(psReportCommand, 30000, { userId });
		const domainsReportResult = await executeCommand(DokkuCommands.domainsReport(name), 30000, {
			userId,
		});

		if (psReportResult.exitCode !== 0) {
			return {
				error: "Failed to get app details",
				command: psReportResult.command,
				exitCode: psReportResult.exitCode,
				stderr: psReportResult.stderr,
			};
		}

		return {
			name,
			status: parseStatus(psReportResult.stdout),
			gitRemote: parseGitRemote(psReportResult.stdout),
			domains: parseDomains(domainsReportResult.stdout),
			processes: parseProcesses(psReportResult.stdout),
			canScale: parseCanScale(psReportResult.stdout),
		};
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || UNKNOWN_ERROR,
			command: psReportCommand,
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

function parseGitRemote(stdout: string): string {
	const lines = stdout.split("\n").map((line) => stripAnsi(line));
	for (const line of lines) {
		if (line.includes("app deployed:")) {
			return line;
		}
	}
	return "";
}

function parseCanScale(stdout: string): boolean {
	const lines = stdout.split("\n").map((line) => stripAnsi(line));
	for (const line of lines) {
		const match = line.match(/ps\s+can\s+scale:\s*(true|false)/i);
		if (match) {
			return match[1].toLowerCase() === "true";
		}
	}
	return false;
}

function parseProcesses(stdout: string): Record<string, number> {
	const processes: Record<string, number> = {};
	const lines = stdout.split("\n").map((line) => stripAnsi(line));

	for (const line of lines) {
		const processMatch = line.match(/process type scale: (.+)/);
		if (processMatch) {
			const procInfo = processMatch[1].trim();
			const scales = procInfo.split(/\s+/);
			for (const scale of scales) {
				const [procType, countStr] = scale.split("=");
				if (procType) {
					processes[procType] = Number.parseInt(countStr || "0", 10) || 0;
				}
			}
		}

		const processStatusMatch = line.match(/status\s+([a-z0-9-]+)\s+\d+:\s*(running|stopped)/i);
		if (processStatusMatch) {
			const processType = processStatusMatch[1].toLowerCase();
			processes[processType] = (processes[processType] || 0) + 1;
		}
	}

	return processes;
}

export async function createApp(
	name: string,
	userId?: string
): Promise<CommandResult | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("create-app");
	}

	const result = await executeCommand(DokkuCommands.appsCreate(name), 30000, { userId });
	return result;
}

export async function destroyApp(
	name: string,
	confirmName: string,
	userId?: string
): Promise<CommandResult | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("destroy-app");
	}

	if (confirmName !== name) {
		return {
			error: "App name confirmation does not match",
			command: "destroy-app-validation",
			exitCode: 400,
			stderr: "App name confirmation does not match",
		};
	}

	const result = await executeCommand(DokkuCommands.appsDestroy(name), 30000, { userId });
	return result;
}

export async function restartApp(
	name: string,
	userId?: string
): Promise<CommandResult | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("restart-app");
	}

	return executeCommand(DokkuCommands.psRestart(name), 120000, { userId });
}

export async function stopApp(
	name: string,
	userId?: string
): Promise<CommandResult | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("stop-app");
	}

	return executeCommand(DokkuCommands.psStop(name), 60000, { userId });
}

export async function startApp(
	name: string,
	userId?: string
): Promise<CommandResult | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("start-app");
	}

	return executeCommand(DokkuCommands.psStart(name), 60000, { userId });
}

export async function rebuildApp(
	name: string,
	userId?: string
): Promise<CommandResult | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("rebuild-app");
	}

	return executeCommand(DokkuCommands.psRebuild(name), 120000, { userId });
}

export async function scaleApp(
	name: string,
	processType: string,
	count: number,
	userId?: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	if (!processType || !/^[a-z0-9-]+$/.test(processType)) {
		return {
			error: "Invalid process type",
			command: "",
			exitCode: 400,
		};
	}

	if (count < 0 || count > 100) {
		return {
			error: "Process count must be between 0 and 100",
			command: "",
			exitCode: 400,
		};
	}

	return executeCommand(DokkuCommands.psScale(name, processType, count), 30000, { userId });
}

export async function unlockApp(
	name: string,
	userId?: string
): Promise<CommandResult | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return createValidationError("unlock-app");
	}

	return executeCommand(DokkuCommands.appsUnlock(name), 30000, { userId });
}
