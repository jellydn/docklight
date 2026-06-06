import { executeCommand } from "./executor.js";

export const HEALTH_WARNING_THRESHOLD = 70;
export const HEALTH_CRITICAL_THRESHOLD = 90;

const METRIC_KEYS = ["cpu", "memory", "disk"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

export type HealthStatus = "ok" | "warning" | "critical";

export interface ResourceHealth {
	value: number;
	status: HealthStatus;
}

export interface ServerHealth {
	cpu: number;
	memory: number;
	disk: number;
	status: HealthStatus;
	resources: Record<MetricKey, ResourceHealth>;
}

export function getResourceStatus(value: number): HealthStatus {
	if (value >= HEALTH_CRITICAL_THRESHOLD) {
		return "critical";
	}
	if (value >= HEALTH_WARNING_THRESHOLD) {
		return "warning";
	}
	return "ok";
}

const OVERALL_STATUS_ORDER: HealthStatus[] = ["critical", "warning", "ok"];

function getOverallStatus(statuses: HealthStatus[]): HealthStatus {
	return OVERALL_STATUS_ORDER.find((status) => statuses.includes(status)) ?? "ok";
}

function clampPercent(value: number): number {
	return Math.min(100, Math.max(0, value));
}

export function buildServerHealth(cpu: number, memory: number, disk: number): ServerHealth {
	const rawValues: Record<MetricKey, number> = { cpu, memory, disk };
	const values = Object.fromEntries(
		METRIC_KEYS.map((key) => [key, clampPercent(rawValues[key])])
	) as Record<MetricKey, number>;

	const resources = Object.fromEntries(
		METRIC_KEYS.map((key) => {
			const value = values[key];
			return [key, { value, status: getResourceStatus(value) }];
		})
	) as Record<MetricKey, ResourceHealth>;

	return {
		...values,
		status: getOverallStatus(METRIC_KEYS.map((key) => resources[key].status)),
		resources,
	};
}

function parseCpuPercent(stdout: string): number {
	return parseFloat(stdout.trim()) || 0;
}

function parseMemoryPercent(stdout: string): number {
	const memLine = stdout.split("\n").find((line) => line.startsWith("Mem:"));
	if (!memLine) {
		return 0;
	}

	const parts = memLine.split(/\s+/);
	if (parts.length < 3) {
		return 0;
	}

	const total = parseFloat(parts[1]);
	const used = parseFloat(parts[2]);
	return total > 0 ? (used / total) * 100 : 0;
}

function parseDiskPercent(stdout: string): number {
	const match = stdout.trim().match(/(\d+)/);
	return match ? parseFloat(match[0]) || 0 : 0;
}

export async function getServerHealth(): Promise<
	ServerHealth | { error: string; command: string; exitCode: number; stderr: string }
> {
	try {
		const [cpuResult, memResult, diskResult] = await Promise.all([
			executeCommand(
				"grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'"
			),
			executeCommand("free -m"),
			executeCommand("df -h / | awk 'NR==2 {print $5}'"),
		]);

		const cpu = cpuResult.exitCode === 0 ? parseCpuPercent(cpuResult.stdout) : 0;
		const memory = memResult.exitCode === 0 ? parseMemoryPercent(memResult.stdout) : 0;
		const disk = diskResult.exitCode === 0 ? parseDiskPercent(diskResult.stdout) : 0;

		return buildServerHealth(cpu, memory, disk);
	} catch (error: unknown) {
		const err = error as { message?: string };
		return {
			error: err.message || "Unknown error occurred",
			command: "server health check",
			exitCode: 1,
			stderr: err.message || "",
		};
	}
}
