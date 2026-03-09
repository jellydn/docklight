import type express from "express";
import { disableProxy, enableProxy, getProxyReport } from "../lib/ports.js";
import { clearPrefix } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, handleCommandResult, getStatusCode } from "./util.js";
import { streamAction } from "./stream-util.js";

export function registerAppProxyRoutes(app: express.Application): void {
	app.get("/api/apps/:name/proxy", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const proxyReport = await getProxyReport(name);
		if ("error" in proxyReport) {
			res.status(getStatusCode(proxyReport.exitCode)).json(proxyReport);
			return;
		}

		res.json(proxyReport);
	});

	app.post("/api/apps/:name/proxy/enable", authMiddleware, requireOperator, async (req, res) => {
		try {
			const name = getParam(req.params, "name");

			if (isSSERequest(req)) {
				if (!isValidAppName(name)) {
					res.status(400).json({ error: "Invalid app name" });
					return;
				}
				await streamAction(req, res, {
					dokkuCommand: DokkuCommands.proxyEnable(name),
					auditAction: "proxy:enable",
					appName: name,
				});
				return;
			}

			const result = await enableProxy(name);
			if (!handleCommandResult(res, result)) return;

			clearPrefix("apps:");
			res.json(result);
		} catch (error: unknown) {
			const err = error as { message?: string };
			logger.error({ err }, "Error enabling proxy");
			res.status(500).json({ exitCode: 1, stderr: err.message || "Unknown error" });
		}
	});

	app.post("/api/apps/:name/proxy/disable", authMiddleware, requireOperator, async (req, res) => {
		try {
			const name = getParam(req.params, "name");

			if (isSSERequest(req)) {
				if (!isValidAppName(name)) {
					res.status(400).json({ error: "Invalid app name" });
					return;
				}
				await streamAction(req, res, {
					dokkuCommand: DokkuCommands.proxyDisable(name),
					auditAction: "proxy:disable",
					appName: name,
				});
				return;
			}

			const result = await disableProxy(name);
			if (!handleCommandResult(res, result)) return;

			clearPrefix("apps:");
			res.json(result);
		} catch (error: unknown) {
			const err = error as { message?: string };
			logger.error({ err }, "Error disabling proxy");
			res.status(500).json({ exitCode: 1, stderr: err.message || "Unknown error" });
		}
	});
}
