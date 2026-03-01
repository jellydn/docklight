import type express from "express";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import {
	getServerConfig,
	updateServerConfig,
	validateServerConfig,
	type ServerConfig,
} from "../lib/server-config.js";

export function registerServerConfigRoutes(app: express.Application): void {
	app.get("/api/server/config", authMiddleware, requireAdmin, (_req, res) => {
		const config = getServerConfig();
		res.json(config);
	});

	app.put("/api/server/config", authMiddleware, requireAdmin, (req, res) => {
		const body = req.body as Partial<ServerConfig>;

		if (!body || typeof body !== "object" || Array.isArray(body)) {
			res.status(400).json({ error: "Invalid request body" });
			return;
		}

		const allowedKeys: (keyof ServerConfig)[] = [
			"dokkuSshTarget",
			"dokkuSshRootTarget",
			"dokkuSshKeyPath",
			"dokkuSshOpts",
			"logLevel",
		];

		const updates: Partial<ServerConfig> = {};
		for (const key of allowedKeys) {
			if (key in body) {
				const val = body[key];
				if (typeof val === "string") {
					updates[key] = val;
				}
			}
		}

		const validationError = validateServerConfig(updates);
		if (validationError) {
			res.status(400).json({ error: validationError });
			return;
		}

		try {
			updateServerConfig(updates);
			const updated = getServerConfig();
			res.json(updated);
		} catch (err) {
			logger.error({ err }, "Failed to update server config");
			res.status(500).json({ error: "Failed to update server configuration" });
		}
	});
}
