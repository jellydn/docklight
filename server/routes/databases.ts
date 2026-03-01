import type express from "express";
import type { Database } from "../lib/databases.js";
import {
	createDatabase,
	destroyDatabase,
	getDatabases,
	linkDatabase,
	unlinkDatabase,
} from "../lib/databases.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import type { UserRole } from "../lib/db.js";
import { getParam } from "./util.js";

function filterConnectionInfoForViewer(
	databases: Database[],
	role?: UserRole
): Omit<Database, "connectionInfo">[] {
	if (role === "admin" || role === "operator") {
		return databases;
	}
	return databases.map(({ connectionInfo: _, ...rest }) => rest);
}

export function registerDatabaseRoutes(app: express.Application): void {
	app.get("/api/databases", authMiddleware, async (req, res) => {
		const cacheKey = "databases:list";
		const cached = get(cacheKey) as Database[] | null;

		if (cached) {
			const filtered = filterConnectionInfoForViewer(cached, req.user?.role);
			res.json(filtered);
			return;
		}

		const databases = await getDatabases();
		if (!Array.isArray(databases)) {
			logger.error({ databases }, "Failed to fetch databases");
			res.status(databases.exitCode >= 400 ? databases.exitCode : 500).json(databases);
			return;
		}

		set(cacheKey, databases);
		const filtered = filterConnectionInfoForViewer(databases, req.user?.role);
		res.json(filtered);
	});

	app.post("/api/databases", authMiddleware, requireOperator, async (req, res) => {
		const { plugin, name } = req.body;
		const result = await createDatabase(plugin, name);
		clearPrefix("databases:");
		res.json(result);
	});

	app.post("/api/databases/:name/link", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, app } = req.body;
		const result = await linkDatabase(plugin, name, app);
		clearPrefix("databases:");
		res.json(result);
	});

	app.post("/api/databases/:name/unlink", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, app } = req.body;
		const result = await unlinkDatabase(plugin, name, app);
		clearPrefix("databases:");
		res.json(result);
	});

	app.delete("/api/databases/:name", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, confirmName } = req.body;
		const result = await destroyDatabase(plugin, name, confirmName);
		clearPrefix("databases:");
		res.json(result);
	});
}
