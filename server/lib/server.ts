import { executeCommand, type CommandResult } from "./executor.js";

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
	resources: {
		cpu: ResourceHealth;
		memory: ResourceHealth;
		disk: ResourceHealth;
	};
}

export function getResourceStatus(value: number): HealthStatus {
	if (value >= 90) {
		return "critical";
	}
	if (value >= 70) {
		return "warning";
	}
	return "ok";
}

export function getOverallStatus(statuses: HealthStatus[]): HealthStatus {
	if (statuses.includes("critical")) {
		return "critical";
	}
	if (statuses.includes("warning")) {
		return "warning";
	}
	return "ok";
}

function clampPercent(value: number): number {
	return Math.min(100, Math.max(0, value));
}

export function buildServerHealth(cpu: number, memory: number, disk: number): ServerHealth {
	const clampedCpu = clampPercent(cpu);
	const clampedMemory = clampPercent(memory);
	const clampedDisk = clampPercent(disk);

	const cpuStatus = getResourceStatus(clampedCpu);
	const memoryStatus = getResourceStatus(clampedMemory);
	const diskStatus = getResourceStatus(clampedDisk);

	return {
		cpu: clampedCpu,
		memory: clampedMemory,
		disk: clampedDisk,
		status: getOverallStatus([cpuStatus, memoryStatus, diskStatus]),
		resources: {
			cpu: { value: clampedCpu, status: cpuStatus },
			memory: { value: clampedMemory, status: memoryStatus },
			disk: { value: clampedDisk, status: diskStatus },
		},
	};
}

export async function getServerHealth(): Promise<
	ServerHealth | { error: string; command: string; exitCode: number; stderr: string }
> {
	try {
		let cpu = 0;
		let memory = 0;
		let disk = 0;

		const cpuResult = await executeCommand(
			"grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'"
		);
		if (cpuResult.exitCode === 0) {
			cpu = parseFloat(cpuResult.stdout.trim()) || 0;
		}

		const memResult = await executeCommand("free -m");
		if (memResult.exitCode === 0) {
			const lines = memResult.stdout.split("\n");
			const memLine = lines.find((line) => line.startsWith("Mem:"));
			if (memLine) {
				const parts = memLine.split(/\s+/);
				if (parts.length >= 3) {
					const total = parseFloat(parts[1]);
					const used = parseFloat(parts[2]);
					memory = total > 0 ? (used / total) * 100 : 0;
				}
			}
		}

		const diskResult = await executeCommand("df -h / | awk 'NR==2 {print $5}'");
		if (diskResult.exitCode === 0) {
			const percentageStr = diskResult.stdout.trim();
			const match = percentageStr.match(/(\d+)/);
			if (match) {
				disk = parseFloat(match[0]) || 0;
			}
		}

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

export async function runServerCleanup(userId?: string): Promise<CommandResult> {
	return executeCommand("dokku cleanup", 120000, { userId });
}
