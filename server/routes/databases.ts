import type express from "express";
import {
	createDatabase,
	destroyDatabase,
	getDatabases,
	linkDatabase,
	unlinkDatabase,
} from "../lib/databases.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../lib/auth.js";
import { getParam } from "./util.js";

export function registerDatabaseRoutes(app: express.Application): void {
	app.get("/api/databases", authMiddleware, async (_req, res) => {
		const cacheKey = "databases:list";
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const databases = await getDatabases();
		if (!Array.isArray(databases)) {
			logger.error({ databases }, "Failed to fetch databases");
			res.status(databases.exitCode >= 400 ? databases.exitCode : 500).json(databases);
			return;
		}

		set(cacheKey, databases);
		res.json(databases);
	});

	app.post("/api/databases", authMiddleware, async (req, res) => {
		const { plugin, name } = req.body;
		const result = await createDatabase(plugin, name);
		clearPrefix("databases:");
		res.json(result);
	});

	app.post("/api/databases/:name/link", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, app } = req.body;
		const result = await linkDatabase(plugin, name, app);
		clearPrefix("databases:");
		res.json(result);
	});

	app.post("/api/databases/:name/unlink", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, app } = req.body;
		const result = await unlinkDatabase(plugin, name, app);
		clearPrefix("databases:");
		res.json(result);
	});

	app.delete("/api/databases/:name", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, confirmName } = req.body;
		const result = await destroyDatabase(plugin, name, confirmName);
		clearPrefix("databases:");
		res.json(result);
	});
}
