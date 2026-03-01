import type express from "express";
import { getAuditLogs, getRecentCommands } from "../lib/db.js";

export function registerCommandRoutes(app: express.Application): void {
	app.get("/api/commands", (req, res) => {
		const limit = Number.parseInt(req.query.limit as string) || 20;
		const commands = getRecentCommands(limit);
		res.json(commands);
	});

	app.get("/api/audit/logs", (req, res) => {
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
}
