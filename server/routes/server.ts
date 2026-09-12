import type express from "express";
import { getServerHealth, type ServerHealth } from "../lib/server.js";
import { purgeAllAppCaches, runCleanup } from "../lib/server-maintenance.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { del, get, set } from "../lib/cache.js";
import {
	getStatusCode,
	getUserId,
	handleCommandResult,
	safeAuditLog,
	type CommandResultLike,
} from "./util.js";

const HEALTH_CACHE_KEY = "server:health";

async function runServerMaintenanceAction(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction,
	options: {
		run: (userId: string | undefined) => Promise<CommandResultLike>;
		auditAction: string;
	}
): Promise<void> {
	try {
		const userId = getUserId(req);
		const result = await options.run(userId);

		if (!handleCommandResult(res, result)) {
			return;
		}

		safeAuditLog(req, options.auditAction, null);
		del(HEALTH_CACHE_KEY);
		res.json(result);
	} catch (error) {
		next(error);
	}
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

	app.post("/api/server/cleanup", authMiddleware, requireOperator, (req, res, next) =>
		runServerMaintenanceAction(req, res, next, {
			run: runCleanup,
			auditAction: "server:cleanup",
		})
	);

	app.post("/api/server/purge-cache", authMiddleware, requireOperator, (req, res, next) =>
		runServerMaintenanceAction(req, res, next, {
			run: purgeAllAppCaches,
			auditAction: "server:purge-cache",
		})
	);
}
