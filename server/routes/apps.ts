import type express from "express";
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
import { getParam } from "./util.js";

export function registerAppRoutes(app: express.Application): void {
	app.get("/api/apps", authMiddleware, async (_req, res) => {
		const cacheKey = "apps:list";
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const apps = await getApps();
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

		const result = await createApp(name);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		clearPrefix("apps:");
		res.status(201).json({ success: true, name });
	});

	app.get("/api/apps/:name", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const app = await getAppDetail(name);
		res.json(app);
	});

	app.post("/api/apps/:name/restart", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await restartApp(name);
		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/rebuild", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await rebuildApp(name);
		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/stop", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await stopApp(name);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/start", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await startApp(name);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/scale", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { processType, count } = req.body;
		const result = await scaleApp(name, processType, count);
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
		const result = await destroyApp(name, confirmName);

		if (result.exitCode !== 0) {
			const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
			res.status(statusCode).json(result);
			return;
		}

		clearPrefix("apps:");
		res.json(result);
	});
}
