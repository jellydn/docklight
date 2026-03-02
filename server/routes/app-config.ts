import type express from "express";
import { getConfig, setConfig, unsetConfig } from "../lib/config.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { insertAuditLog } from "../lib/db.js";
import { getParam } from "./util.js";
import { getIpAddress } from "./util.js";

export function registerAppConfigRoutes(app: express.Application): void {
	app.get("/api/apps/:name/config", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const config = await getConfig(name);
		res.json(config);
	});

	app.post("/api/apps/:name/config", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { key, value } = req.body;
		const result = await setConfig(name, key, value);

		if (result.exitCode === 0) {
			// Audit log config set
			insertAuditLog(
				req.user?.userId ?? null,
				"config:set",
				name,
				JSON.stringify({ app: name, key }),
				getIpAddress(req)
			);
		}

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/config/:key", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const key = getParam(req.params, "key");
		const result = await unsetConfig(name, key);

		if (result.exitCode === 0) {
			// Audit log config unset
			insertAuditLog(
				req.user?.userId ?? null,
				"config:unset",
				name,
				JSON.stringify({ app: name, key }),
				getIpAddress(req)
			);
		}

		clearPrefix("apps:");
		res.json(result);
	});
}
