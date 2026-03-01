import type express from "express";
import { getServerHealth } from "../lib/server.js";
import { authMiddleware } from "../lib/auth.js";

export function registerServerRoutes(app: express.Application): void {
	app.get("/api/server/health", authMiddleware, async (_req, res) => {
		const health = await getServerHealth();
		res.json(health);
	});
}
