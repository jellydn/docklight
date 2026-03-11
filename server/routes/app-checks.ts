import type express from "express";
import { getChecksReport } from "../lib/checks.js";
import { get, set } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, getStatusCode } from "./util.js";
import { streamAction } from "./stream-util.js";

const CHECKS_RUN_TIMEOUT_MS = 120_000;

/** Registers API routes for checks management (enable/disable/skip/run) */
export function registerAppChecksRoutes(app: express.Application): void {
	app.get("/api/apps/:name/checks", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		if (!isValidAppName(name)) {
			res.status(400).json({ error: "Invalid app name" });
			return;
		}
		const cacheKey = `apps:${name}:checks`;
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const report = await getChecksReport(name);
		if ("error" in report) {
			res.status(getStatusCode(report.exitCode)).json(report);
			return;
		}

		set(cacheKey, report);
		res.json(report);
	});

	app.post("/api/apps/:name/checks/enable", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		if (!isSSERequest(req)) {
			res.status(400).json({ error: "This endpoint requires Accept: text/event-stream" });
			return;
		}
		if (!isValidAppName(name)) {
			res.status(400).json({ error: "Invalid app name" });
			return;
		}
		await streamAction(req, res, {
			dokkuCommand: DokkuCommands.checksEnable(name),
			auditAction: "checks:enable",
			appName: name,
		});
	});

	app.post("/api/apps/:name/checks/disable", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		if (!isSSERequest(req)) {
			res.status(400).json({ error: "This endpoint requires Accept: text/event-stream" });
			return;
		}
		if (!isValidAppName(name)) {
			res.status(400).json({ error: "Invalid app name" });
			return;
		}
		await streamAction(req, res, {
			dokkuCommand: DokkuCommands.checksDisable(name),
			auditAction: "checks:disable",
			appName: name,
		});
	});

	app.post("/api/apps/:name/checks/skip", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		if (!isSSERequest(req)) {
			res.status(400).json({ error: "This endpoint requires Accept: text/event-stream" });
			return;
		}
		if (!isValidAppName(name)) {
			res.status(400).json({ error: "Invalid app name" });
			return;
		}
		await streamAction(req, res, {
			dokkuCommand: DokkuCommands.checksSkip(name),
			auditAction: "checks:skip",
			appName: name,
		});
	});

	app.post("/api/apps/:name/checks/run", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		if (!isSSERequest(req)) {
			res.status(400).json({ error: "This endpoint requires Accept: text/event-stream" });
			return;
		}
		if (!isValidAppName(name)) {
			res.status(400).json({ error: "Invalid app name" });
			return;
		}
		await streamAction(req, res, {
			dokkuCommand: DokkuCommands.checksRun(name),
			auditAction: "checks:run",
			appName: name,
			timeout: CHECKS_RUN_TIMEOUT_MS,
		});
	});
}
