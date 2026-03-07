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
import { executeCommandStreaming } from "../lib/executor.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import type { UserRole } from "../lib/db.js";
import { getParam, safeAuditLog } from "./util.js";

function filterConnectionInfoForViewer(
	databases: Database[],
	role?: UserRole
): Omit<Database, "connectionInfo">[] {
	if (role === "admin" || role === "operator") {
		return databases;
	}
	return databases.map(({ connectionInfo: _, ...rest }) => rest);
}

async function streamAction(
	req: express.Request,
	res: express.Response,
	dokkuCommand: string,
	auditAction: string,
	name: string,
	timeout: number = 120000
): Promise<void> {
	const sse = createSSEWriter(res);
	try {
		const result = await executeCommandStreaming(
			dokkuCommand,
			(event) => {
				if (event.type === "progress") {
					sse.sendProgress(event.message);
				} else {
					sse.sendOutput(event.message, event.error);
				}
			},
			timeout
		);

		if (result.exitCode === 0) {
			safeAuditLog(req, auditAction, name);
			clearPrefix("databases:");
		}
		sse.sendResult(result);
	} catch (err) {
		sse.sendError(err instanceof Error ? err.message : "Unknown error");
	} finally {
		sse.close();
	}
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

		if (isSSERequest(req)) {
			await streamAction(
				req,
				res,
				DokkuCommands.dbCreate(plugin, name),
				"database:create",
				name,
				300000
			);
			return;
		}

		const result = await createDatabase(plugin, name);

		if (result.exitCode === 0) {
			safeAuditLog(req, "database:create", name, { plugin, name });
		}

		clearPrefix("databases:");
		res.json(result);
	});

	app.post("/api/databases/:name/link", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, app } = req.body;

		if (isSSERequest(req)) {
			await streamAction(
				req,
				res,
				DokkuCommands.dbLink(plugin, name, app),
				"database:link",
				name,
				60000
			);
			return;
		}

		const result = await linkDatabase(plugin, name, app);

		if (result.exitCode === 0) {
			safeAuditLog(req, "database:link", name, { plugin, database: name, app });
		}

		clearPrefix("databases:");
		res.json(result);
	});

	app.post("/api/databases/:name/unlink", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, app } = req.body;

		if (isSSERequest(req)) {
			await streamAction(
				req,
				res,
				DokkuCommands.dbUnlink(plugin, name, app),
				"database:unlink",
				name,
				60000
			);
			return;
		}

		const result = await unlinkDatabase(plugin, name, app);

		if (result.exitCode === 0) {
			safeAuditLog(req, "database:unlink", name, { plugin, database: name, app });
		}

		clearPrefix("databases:");
		res.json(result);
	});

	app.delete("/api/databases/:name", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { plugin, confirmName } = req.body;

		if (isSSERequest(req)) {
			await streamAction(
				req,
				res,
				DokkuCommands.dbDestroy(plugin, name),
				"database:destroy",
				name,
				120000
			);
			return;
		}

		const result = await destroyDatabase(plugin, name, confirmName);

		if (result.exitCode === 0) {
			safeAuditLog(req, "database:destroy", name, { plugin, name });
		}

		clearPrefix("databases:");
		res.json(result);
	});
}
