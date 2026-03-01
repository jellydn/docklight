import type express from "express";
import { getConfig, setConfig, unsetConfig } from "../lib/config.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { getParam } from "./util.js";

export function registerAppConfigRoutes(app: express.Application): void {
	app.get("/api/apps/:name/config", authMiddleware, requireAdmin, async (req, res) => {
		const name = getParam(req.params, "name");
		const config = await getConfig(name);
		res.json(config);
	});

	app.post("/api/apps/:name/config", authMiddleware, requireAdmin, async (req, res) => {
		const name = getParam(req.params, "name");
		const { key, value } = req.body;
		const result = await setConfig(name, key, value);
		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/config/:key", authMiddleware, requireAdmin, async (req, res) => {
		const name = getParam(req.params, "name");
		const key = getParam(req.params, "key");
		const result = await unsetConfig(name, key);
		clearPrefix("apps:");
		res.json(result);
	});
}
