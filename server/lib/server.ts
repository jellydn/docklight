import { executeCommand } from "./executor.js";

export interface ServerHealth {
	cpu: number;
	memory: number;
	disk: number;
}

export async function getServerHealth(): Promise<
	| ServerHealth
	| { error: string; command: string; exitCode: number; stderr: string }
> {
	try {
		let cpu = 0;
		let memory = 0;
		let disk = 0;

		// Parse CPU from /proc/stat
		const cpuResult = await executeCommand(
			"grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'",
		);
		if (cpuResult.exitCode === 0) {
			cpu = parseFloat(cpuResult.stdout.trim()) || 0;
		}

		// Parse memory from free -m
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

		// Parse disk from df -h
		const diskResult = await executeCommand("df -h / | awk 'NR==2 {print $5}'");
		if (diskResult.exitCode === 0) {
			const percentageStr = diskResult.stdout.trim();
			const match = percentageStr.match(/(\d+)/);
			if (match) {
				disk = parseFloat(match[0]) || 0;
			}
		}

		return {
			cpu: Math.min(100, Math.max(0, cpu)),
			memory: Math.min(100, Math.max(0, memory)),
			disk: Math.min(100, Math.max(0, disk)),
		};
	} catch (error: any) {
		return {
			error: error.message || "Unknown error occurred",
			command: "server health check",
			exitCode: 1,
			stderr: error.message || "",
		};
	}
}
