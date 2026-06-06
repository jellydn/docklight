import type express from "express";
import { stripAnsi } from "../lib/ansi.js";
import { isValidAppName } from "../lib/apps.js";
import { getServerHealth, type ServerHealth } from "../lib/server.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { del, get, set } from "../lib/cache.js";
import { type CommandResult, executeCommand } from "../lib/executor.js";
import { DokkuCommands } from "../lib/dokku.js";
import { getStatusCode, getUserId, handleCommandResult, safeAuditLog } from "./util.js";

const HEALTH_CACHE_KEY = "server:health";
const CLEANUP_TIMEOUT_MS = 120000;
const PURGE_AGGREGATE_COMMAND = "dokku repo:purge-cache --all-apps";

interface PurgeCacheResult extends CommandResult {
	results: Array<CommandResult & { app: string }>;
}

async function listAppNames(userId?: string): Promise<string[] | CommandResult> {
	const listCommands = [DokkuCommands.appsListQuiet(), DokkuCommands.appsList()];
	let listResult: CommandResult | undefined;

	for (const command of listCommands) {
		const result = await executeCommand(command, 30000, { userId });
		if (result.exitCode === 0) {
			return result.stdout
				.split("\n")
				.map((line) => stripAnsi(line).trim())
				.filter(isValidAppName);
		}
		listResult = result;
	}

	return {
		command: listResult?.command || DokkuCommands.appsList(),
		exitCode: listResult?.exitCode || 1,
		stdout: "",
		stderr: listResult?.stderr || "Failed to list apps",
	};
}

async function purgeAllAppCaches(userId?: string): Promise<PurgeCacheResult> {
	const appNamesResult = await listAppNames(userId);
	if (!Array.isArray(appNamesResult)) {
		return {
			command: PURGE_AGGREGATE_COMMAND,
			exitCode: appNamesResult.exitCode,
			stdout: "",
			stderr: appNamesResult.stderr,
			results: [],
		};
	}

	const results: Array<CommandResult & { app: string }> = [];
	for (const app of appNamesResult) {
		const result = await executeCommand(DokkuCommands.repoPurgeCache(app), CLEANUP_TIMEOUT_MS, {
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

export function registerServerRoutes(app: express.Application): void {
	app.get("/api/server/health", authMiddleware, async (_req, res) => {
		const cached = get<ServerHealth>(HEALTH_CACHE_KEY);
		if (cached) {
			res.json(cached);
			return;
		}

		const health = await getServerHealth();
		if ("error" in health) {
			res.status(getStatusCode(health.exitCode)).json(health);
			return;
		}

		set(HEALTH_CACHE_KEY, health);
		res.json(health);
	});

	app.post("/api/server/cleanup", authMiddleware, requireOperator, async (req, res, next) => {
		try {
			const userId = getUserId(req);
			const result = await executeCommand(DokkuCommands.cleanup(), CLEANUP_TIMEOUT_MS, { userId });

			if (!handleCommandResult(res, result)) {
				return;
			}

			safeAuditLog(req, "server:cleanup", null);
			del(HEALTH_CACHE_KEY);
			res.json(result);
		} catch (error) {
			next(error);
		}
	});

	app.post("/api/server/purge-cache", authMiddleware, requireOperator, async (req, res, next) => {
		try {
			const userId = getUserId(req);
			const result = await purgeAllAppCaches(userId);

			if (!handleCommandResult(res, result)) {
				return;
			}

			safeAuditLog(req, "server:purge-cache", null);
			del(HEALTH_CACHE_KEY);
			res.json(result);
		} catch (error) {
			next(error);
		}
	});
}
