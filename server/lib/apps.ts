import { type CommandResult, executeCommand } from "./executor.js";

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
}

function stripAnsi(value: string): string {
	return value.replaceAll("\u001b", "").replace(/\[[0-9;]*m/g, "");
}

const UNKNOWN_ERROR = "Unknown error";

function withRuntimeHint(command: string, stderr: string): string {
	const lowerStderr = stderr.toLowerCase();
	const lowerCommand = command.toLowerCase();
	if (lowerCommand.includes("dokku") && lowerStderr.includes("not found")) {
		return `${stderr}. Dokku CLI is unavailable in this runtime`;
	}
	return stderr;
}

export async function getApps(): Promise<
	App[] | { error: string; command: string; exitCode: number; stderr: string }
> {
	try {
		const listCommands = [
			"dokku apps:list --quiet",
			"dokku --quiet apps:list",
			"dokku apps:list",
		];
		let listResult: CommandResult | undefined;

		for (const command of listCommands) {
			const result = await executeCommand(command);
			if (result.exitCode === 0) {
				return await fetchAppDetails(result.stdout);
			}
			listResult = result;
		}

		return {
			error: "Failed to list apps",
			command: listResult?.command || "dokku apps:list",
			exitCode: listResult?.exitCode || 1,
			stderr: withRuntimeHint(
				listResult?.command || "dokku apps:list",
				listResult?.stderr || UNKNOWN_ERROR
			),
		};
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || UNKNOWN_ERROR,
			command: "dokku apps:list",
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}

async function fetchAppDetails(stdout: string): Promise<App[]> {
	const appNames = stdout
		.split("\n")
		.map((line) => stripAnsi(line).trim())
		.filter(isValidAppName);

	if (appNames.length === 0) {
		return [];
	}

	return Promise.all(
		appNames.map(async (appName) => {
			const [psReportResult, domainsReportResult] = await Promise.all([
				executeCommand(`dokku ps:report ${appName}`),
				executeCommand(`dokku domains:report ${appName}`),
			]);

			return {
				name: appName,
				status: parseStatus(psReportResult.stdout),
				domains: parseDomains(domainsReportResult.stdout),
				lastDeployTime: parseDeployTime(psReportResult.stdout),
			};
		})
	);
}

function parseStatus(stdout: string): "running" | "stopped" {
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
		const isDeployedKey = /\bdeployed\b/.test(key) && !/\bapp deployed\b/.test(key);
		if (isRunningKey || isDeployedKey) {
			return value === "true" ? "running" : "stopped";
		}
	}

	if (sawProcessStatus) {
		return sawRunningProcess ? "running" : "stopped";
	}

	return "stopped";
}

function parseDeployTime(stdout: string): string | undefined {
	const lines = stdout.split("\n").map((line) => stripAnsi(line));
	for (const line of lines) {
		if (line.includes("deployed at")) {
			const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
			if (match) {
				return match[1];
			}
		}
	}
	return undefined;
}

function parseDomains(stdout: string): string[] {
	const lines = stdout.split("\n").map((line) => stripAnsi(line));
	const domains = new Set<string>();

	for (const line of lines) {
		const vhostsMatch = line.match(/domains(?:\s+app)?\s+vhosts:\s*(.+)$/i);
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

export function isValidAppName(name: string): boolean {
	return /^[a-z0-9-]+$/.test(name);
}

export async function getAppDetail(
	name: string
): Promise<AppDetail | { error: string; command: string; exitCode: number; stderr: string }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		};
	}

	try {
		const psReportResult = await executeCommand(`dokku ps:report ${name}`);
		const domainsReportResult = await executeCommand(`dokku domains:report ${name}`);

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
		};
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || UNKNOWN_ERROR,
			command: `dokku ps:report ${name}`,
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
	name: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	const result = await executeCommand(`dokku apps:create ${name}`);
	return result;
}

export async function restartApp(
	name: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	return executeCommand(`dokku ps:restart ${name}`);
}

export async function rebuildApp(
	name: string
): Promise<CommandResult | { error: string; exitCode: number }> {
	if (!isValidAppName(name)) {
		return {
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		};
	}

	return executeCommand(`dokku ps:rebuild ${name}`);
}

export async function scaleApp(
	name: string,
	processType: string,
	count: number
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

	return executeCommand(`dokku ps:scale ${name} ${processType}=${count}`);
}
