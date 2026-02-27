import { executeCommand } from "./executor.js";

export interface App {
	name: string;
	status: "running" | "stopped";
	domains: string[];
	lastDeployTime?: string;
}

export async function getApps(): Promise<
	App[] | { error: string; command: string; exitCode: number; stderr: string }
> {
	try {
		const listResult = await executeCommand("dokku apps:list");

		if (listResult.exitCode !== 0) {
			return {
				error: "Failed to list apps",
				command: listResult.command,
				exitCode: listResult.exitCode,
				stderr: listResult.stderr,
			};
		}

		const appNames = listResult.stdout
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (appNames.length === 0) {
			return [];
		}

		const apps: App[] = [];

		for (const appName of appNames) {
			const psReportResult = await executeCommand(`dokku ps:report ${appName}`);
			const domainsReportResult = await executeCommand(
				`dokku domains:report ${appName}`,
			);

			let status: "running" | "stopped" = "stopped";
			let domains: string[] = [];
			let lastDeployTime: string | undefined;

			if (psReportResult.exitCode === 0) {
				const lines = psReportResult.stdout.split("\n");
				for (const line of lines) {
					if (line.includes("deployed")) {
						status = "running";
					}
					if (line.includes("deployed at")) {
						const match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
						if (match) {
							lastDeployTime = match[1];
						}
					}
				}
			}

			if (domainsReportResult.exitCode === 0) {
				const lines = domainsReportResult.stdout.split("\n");
				for (const line of lines) {
					if (line.includes("domains vhosts")) {
						const match = line.match(/:\s*(.+)/);
						if (match) {
							domains = match[1].split(" ").filter((d) => d.length > 0);
						}
					}
				}
			}

			apps.push({
				name: appName,
				status,
				domains,
				lastDeployTime,
			});
		}

		return apps;
	} catch (error: any) {
		return {
			error: error.message || "Unknown error occurred",
			command: "dokku apps:list",
			exitCode: 1,
			stderr: error.message || "",
		};
	}
}
