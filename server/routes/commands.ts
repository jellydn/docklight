import type express from "express";
import { getAuditLogs, getRecentCommands, getUserAuditLogs } from "../lib/db.js";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { get, set } from "../lib/cache.js";

export function registerCommandRoutes(app: express.Application): void {
	app.get("/api/commands", authMiddleware, (req, res) => {
		const limit = Number.parseInt(req.query.limit as string) || 20;
		const cacheKey = `commands:recent:${limit}`;
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const commands = getRecentCommands(limit);
		set(cacheKey, commands, 5000);
		res.json(commands);
	});

	app.get("/api/audit/logs", authMiddleware, (req, res) => {
		const limit = Number.parseInt(req.query.limit as string) || 50;
		const offset = Number.parseInt(req.query.offset as string) || 0;
		const startDate = req.query.startDate as string | undefined;
		const endDate = req.query.endDate as string | undefined;
		const command = req.query.command as string | undefined;
		const exitCode = (req.query.exitCode as string) || "all";

		if (exitCode !== "all" && exitCode !== "success" && exitCode !== "error") {
			res.status(400).json({
				error: "Invalid exitCode filter. Must be 'all', 'success', or 'error'",
			});
			return;
		}

		const result = getAuditLogs({
			limit,
			offset,
			startDate,
			endDate,
			command,
			exitCode: exitCode as "all" | "success" | "error",
		});

		res.json(result);
	});

	app.get("/api/audit/user-logs", authMiddleware, requireAdmin, (req, res) => {
		const parsedLimit = Number.parseInt(req.query.limit as string, 10);
		const parsedOffset = Number.parseInt(req.query.offset as string, 10);
		const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 50;
		const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;
		const startDate = req.query.startDate as string | undefined;
		const endDate = req.query.endDate as string | undefined;
		const userId = req.query.userId as string | undefined;
		const action = req.query.action as string | undefined;

		if (userId !== undefined && !/^\d+$/.test(userId)) {
			res.status(400).json({ error: "Invalid userId filter" });
			return;
		}

		const result = getUserAuditLogs({
			limit,
			offset,
			startDate,
			endDate,
			userId: userId !== undefined ? Number.parseInt(userId, 10) : undefined,
			action,
		});

		res.json(result);
	});
}
