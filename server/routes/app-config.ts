import type express from "express";
import { getConfig, setConfig, unsetConfig } from "../lib/config.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, safeAuditLog } from "./util.js";
import { streamAction } from "./stream-util.js";

export function registerAppConfigRoutes(app: express.Application): void {
	app.get("/api/apps/:name/config", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const config = await getConfig(name);
		res.json(config);
	});

	app.post("/api/apps/:name/config", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { key, value } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !key) {
				res.status(400).json({ error: "Invalid app name or key" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.configSet(name, key, value),
				auditAction: "config:set",
				appName: name,
				auditDetails: { key },
			});
			return;
		}

		const result = await setConfig(name, key, value);

		if (result.exitCode === 0) {
			safeAuditLog(req, "config:set", name, { app: name, key });
		}

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/config/:key", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const key = getParam(req.params, "key");

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !key) {
				res.status(400).json({ error: "Invalid app name or key" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.configUnset(name, key),
				auditAction: "config:unset",
				appName: name,
				auditDetails: { key },
			});
			return;
		}

		const result = await unsetConfig(name, key);

		if (result.exitCode === 0) {
			safeAuditLog(req, "config:unset", name, { app: name, key });
		}

		clearPrefix("apps:");
		res.json(result);
	});
}
