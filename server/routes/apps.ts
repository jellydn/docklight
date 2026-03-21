import type express from "express";
import type { JWTPayload } from "../lib/auth.js";
import {
	getAppDetail,
	getApps,
	isValidAppName,
	rebuildApp,
	restartApp,
	scaleApp,
	createApp,
	destroyApp,
	stopApp,
	startApp,
	unlockApp,
} from "../lib/apps.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { executeCommandStreaming } from "../lib/executor.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import { getParam, safeAuditLog } from "./util.js";
import { broadcastAppEvent } from "../lib/app-events.js";

function getUserId(req: express.Request): string | undefined {
	const user = req.user as JWTPayload | undefined;
	return user?.userId ? String(user.userId) : undefined;
}

async function streamAction(
	req: express.Request,
	res: express.Response,
	dokkuCommand: string,
	userId: string | undefined,
	auditAction: string,
	appName: string,
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
			timeout,
			{ userId }
		);

		if (result.exitCode === 0) {
			safeAuditLog(req, auditAction, appName, { app: appName });
			clearPrefix("apps:");
			broadcastAppEvent({ type: auditAction, appName, timestamp: new Date().toISOString() });
		}
		sse.sendResult(result);
	} catch (err) {
		sse.sendError(err instanceof Error ? err.message : "Unknown error");
	} finally {
		sse.close();
	}
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

		safeAuditLog(req, "app:create", name, { name });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:create", appName: name, timestamp: new Date().toISOString() });
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

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, DokkuCommands.psRestart(name), userId, "app:restart", name);
			return;
		}

		const result = await restartApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		safeAuditLog(req, "app:restart", name, { app: name });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:restart", appName: name, timestamp: new Date().toISOString() });
		res.json(result);
	});

	app.post("/api/apps/:name/rebuild", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, DokkuCommands.psRebuild(name), userId, "app:rebuild", name);
			return;
		}

		const result = await rebuildApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		safeAuditLog(req, "app:rebuild", name, { app: name });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:rebuild", appName: name, timestamp: new Date().toISOString() });
		res.json(result);
	});

	app.post("/api/apps/:name/stop", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, DokkuCommands.psStop(name), userId, "app:stop", name);
			return;
		}

		const result = await stopApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		safeAuditLog(req, "app:stop", name, { app: name });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:stop", appName: name, timestamp: new Date().toISOString() });
		res.json(result);
	});

	app.post("/api/apps/:name/start", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, DokkuCommands.psStart(name), userId, "app:start", name);
			return;
		}

		const result = await startApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		safeAuditLog(req, "app:start", name, { app: name });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:start", appName: name, timestamp: new Date().toISOString() });
		res.json(result);
	});

	app.post("/api/apps/:name/unlock", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const userId = getUserId(req);

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, DokkuCommands.appsUnlock(name), userId, "app:unlock", name);
			return;
		}

		const result = await unlockApp(name, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		safeAuditLog(req, "app:unlock", name, { app: name });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:unlock", appName: name, timestamp: new Date().toISOString() });
		res.json(result);
	});

	app.post("/api/apps/:name/scale", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { processType, count } = req.body;
		const userId = getUserId(req);

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(
				req,
				res,
				DokkuCommands.psScale(name, processType, count),
				userId,
				"app:scale",
				name,
				60000
			);
			return;
		}

		const result = await scaleApp(name, processType, count, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		safeAuditLog(req, "app:scale", name, { app: name, processType, count });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:scale", appName: name, timestamp: new Date().toISOString() });
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

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, DokkuCommands.appsDestroy(name), userId, "app:destroy", name);
			return;
		}

		const result = await destroyApp(name, confirmName, userId);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		safeAuditLog(req, "app:destroy", name, { app: name });

		clearPrefix("apps:");
		broadcastAppEvent({ type: "app:destroy", appName: name, timestamp: new Date().toISOString() });
		res.json(result);
	});
}
