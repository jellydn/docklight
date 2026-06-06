import type express from "express";
import { getServerHealth, type ServerHealth } from "../lib/server.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { del, get, set } from "../lib/cache.js";
import { executeCommand } from "../lib/executor.js";
import { DokkuCommands } from "../lib/dokku.js";
import { getStatusCode, getUserId, handleCommandResult, safeAuditLog } from "./util.js";

const HEALTH_CACHE_KEY = "server:health";
const CLEANUP_TIMEOUT_MS = 120000;

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
}
