import type express from "express";
import { disableProxy, enableProxy, getProxyReport } from "../lib/ports.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware } from "../lib/auth.js";
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

	app.post("/api/apps/:name/proxy/enable", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await enableProxy(name);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.post("/api/apps/:name/proxy/disable", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await disableProxy(name);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});
}
