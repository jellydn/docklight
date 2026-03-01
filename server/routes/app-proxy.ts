import type express from "express";
import { disableProxy, enableProxy, getProxyReport } from "../lib/ports.js";
import { clearPrefix } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { getParam, handleCommandResult } from "./util.js";

export function registerAppProxyRoutes(app: express.Application): void {
	app.get("/api/apps/:name/proxy", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const proxyReport = await getProxyReport(name);
		if ("error" in proxyReport) {
			const statusCode =
				proxyReport.exitCode >= 400 && proxyReport.exitCode < 600 ? proxyReport.exitCode : 500;
			res.status(statusCode).json(proxyReport);
			return;
		}

		res.json(proxyReport);
	});

	app.post("/api/apps/:name/proxy/enable", authMiddleware, requireOperator, async (req, res) => {
		try {
			const name = getParam(req.params, "name");
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
