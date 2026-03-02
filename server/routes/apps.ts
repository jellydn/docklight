import type express from "express";
import type { JWTPayload } from "../lib/auth.js";
import {
	getAppDetail,
	getApps,
	rebuildApp,
	restartApp,
	scaleApp,
	createApp,
	destroyApp,
	stopApp,
	startApp,
} from "../lib/apps.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { insertAuditLog } from "../lib/db.js";
import { getParam, getIpAddress } from "./util.js";

function getUserId(req: express.Request): string | undefined {
	const user = req.user as JWTPayload | undefined;
	return user?.userId ? String(user.userId) : undefined;
}

export function registerAppRoutes(app: express.Application): void {
	app.get("/api/apps", authMiddleware, async (req, res) => {
		const cacheKey = "apps:list";
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const userId = getUserId(req);
		const apps = await getApps(userId);
		if (!Array.isArray(apps)) {
			logger.error({ apps }, "Failed to fetch apps");
			res.status(apps.exitCode >= 400 ? apps.exitCode : 500).json(apps);
			return;
		}

		set(cacheKey, apps);
		res.json(apps);
	});

	app.post("/api/apps", authMiddleware, requireOperator, async (req, res) => {
		const { name } = req.body;
		if (!name || typeof name !== "string") {
			res.status(400).json({ error: "App name is required" });
			return;
		}

		const userId = getUserId(req);
		const result = await createApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		// Audit log app creation
		insertAuditLog(
			req.user?.userId ?? null,
			"app:create",
			name,
			JSON.stringify({ name }),
			getIpAddress(req)
		);

		clearPrefix("apps:");
		res.status(201).json({ success: true, name });
	});

	app.get("/api/apps/:name", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);
		const app = await getAppDetail(name, userId);
		res.json(app);
	});

	app.post("/api/apps/:name/restart", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);
		const result = await restartApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		// Audit log app restart
		insertAuditLog(
			req.user?.userId ?? null,
			"app:restart",
			name,
			JSON.stringify({ app: name }),
			getIpAddress(req)
		);

		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/rebuild", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);
		const result = await rebuildApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		// Audit log app rebuild
		insertAuditLog(
			req.user?.userId ?? null,
			"app:rebuild",
			name,
			JSON.stringify({ app: name }),
			getIpAddress(req)
		);

		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/stop", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);
		const result = await stopApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		// Audit log app stop
		insertAuditLog(
			req.user?.userId ?? null,
			"app:stop",
			name,
			JSON.stringify({ app: name }),
			getIpAddress(req)
		);

		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/start", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);
		const result = await startApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		// Audit log app start
		insertAuditLog(
			req.user?.userId ?? null,
			"app:start",
			name,
			JSON.stringify({ app: name }),
			getIpAddress(req)
		);

		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/scale", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { processType, count } = req.body;
		const userId = getUserId(req);
		const result = await scaleApp(name, processType, count, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		// Audit log app scale
		insertAuditLog(
			req.user?.userId ?? null,
			"app:scale",
			name,
			JSON.stringify({ app: name, processType, count }),
			getIpAddress(req)
		);

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { confirmName } = req.body;
		if (!confirmName || typeof confirmName !== "string") {
			res.status(400).json({ error: "App name confirmation is required" });
			return;
		}
		const userId = getUserId(req);
		const result = await destroyApp(name, confirmName, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		// Audit log app destruction
		insertAuditLog(
			req.user?.userId ?? null,
			"app:destroy",
			name,
			JSON.stringify({ app: name }),
			getIpAddress(req)
		);

		clearPrefix("apps:");
		res.json(result);
	});
}
