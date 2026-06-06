import { listAppNames } from "./apps.js";
import { type CommandResult, executeCommand } from "./executor.js";
import { DokkuCommands } from "./dokku.js";

export const MAINTENANCE_TIMEOUT_MS = 120000;
export const PURGE_AGGREGATE_COMMAND = "dokku repo:purge-cache --all-apps";

export interface PurgeCacheResult extends CommandResult {
	results: Array<CommandResult & { app: string }>;
}

export async function runCleanup(userId?: string): Promise<CommandResult> {
	return executeCommand(DokkuCommands.cleanup(), MAINTENANCE_TIMEOUT_MS, { userId });
}

export async function purgeAllAppCaches(userId?: string): Promise<PurgeCacheResult> {
	const listResult = await listAppNames(userId);
	if (!listResult.ok) {
		return {
			command: PURGE_AGGREGATE_COMMAND,
			exitCode: listResult.error.exitCode,
			stdout: "",
			stderr: listResult.error.stderr,
			results: [],
		};
	}

	const results: Array<CommandResult & { app: string }> = [];
	for (const app of listResult.names) {
		const result = await executeCommand(DokkuCommands.repoPurgeCache(app), MAINTENANCE_TIMEOUT_MS, {
			userId,
		});
		results.push({ ...result, app });
	}

	const failedResults = results.filter((result) => result.exitCode !== 0);
	return {
		command: PURGE_AGGREGATE_COMMAND,
		exitCode: failedResults.length > 0 ? 1 : 0,
		stdout: results
			.map((result) => result.stdout)
			.filter(Boolean)
			.join("\n"),
		stderr: failedResults
			.map((result) => result.stderr)
			.filter(Boolean)
			.join("\n"),
		results,
	};
}
