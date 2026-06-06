import type express from "express";
import type { JWTPayload } from "../lib/auth.js";
import { getServerHealth, runServerCleanup, type ServerHealth } from "../lib/server.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { del, get, set } from "../lib/cache.js";
import { handleCommandResult, safeAuditLog } from "./util.js";

const HEALTH_CACHE_KEY = "server:health";

function getUserId(req: express.Request): string | undefined {
	const user = req.user as JWTPayload | undefined;
	return user?.userId ? String(user.userId) : undefined;
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
			res
				.status(health.exitCode >= 400 && health.exitCode < 600 ? health.exitCode : 500)
				.json(health);
			return;
		}

		set(HEALTH_CACHE_KEY, health);
		res.json(health);
	});

	app.post("/api/server/cleanup", authMiddleware, requireOperator, async (req, res) => {
		const userId = getUserId(req);
		const result = await runServerCleanup(userId);

		if (!handleCommandResult(res, result)) {
			return;
		}

		safeAuditLog(req, "server:cleanup", null);
		del(HEALTH_CACHE_KEY);
		res.json(result);
	});
}
