import type express from "express";
import { clearNetworkProperty, getNetworkReport, setNetworkProperty } from "../lib/network.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware } from "../lib/auth.js";
import { getParam, handleCommandResult } from "./util.js";

export function registerAppNetworkRoutes(app: express.Application): void {
	app.get("/api/apps/:name/network", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const networkReport = await getNetworkReport(name);
		if ("error" in networkReport) {
			const statusCode =
				networkReport.exitCode >= 400 && networkReport.exitCode < 600
					? networkReport.exitCode
					: 500;
			res.status(statusCode).json(networkReport);
			return;
		}

		res.json(networkReport);
	});

	app.put("/api/apps/:name/network", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { key, value } = req.body;

		const result = await setNetworkProperty(name, key, value ?? "");
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/network", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { key } = req.body;

		const result = await clearNetworkProperty(name, key);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});
}
