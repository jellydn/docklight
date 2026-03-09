import type express from "express";
import { clearNetworkProperty, getNetworkReport, setNetworkProperty } from "../lib/network.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, handleCommandResult, getStatusCode } from "./util.js";
import { streamAction } from "./stream-util.js";

export function registerAppNetworkRoutes(app: express.Application): void {
	app.get("/api/apps/:name/network", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const cacheKey = `apps:${name}:network`;
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const networkReport = await getNetworkReport(name);
		if ("error" in networkReport) {
			res.status(getStatusCode(networkReport.exitCode)).json(networkReport);
			return;
		}

		set(cacheKey, networkReport);
		res.json(networkReport);
	});

	app.put("/api/apps/:name/network", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { key, value } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !key) {
				res.status(400).json({ error: "Invalid app name or key" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.networkSet(name, key, value),
				auditAction: "network:set",
				appName: name,
				auditDetails: { key, value },
			});
			return;
		}

		const result = await setNetworkProperty(name, key, value ?? "");
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/network", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { key } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !key) {
				res.status(400).json({ error: "Invalid app name or key" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.networkSet(name, key),
				auditAction: "network:clear",
				appName: name,
				auditDetails: { key },
			});
			return;
		}

		const result = await clearNetworkProperty(name, key);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});
}
