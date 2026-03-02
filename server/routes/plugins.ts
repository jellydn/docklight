import type express from "express";
import { getPlugins } from "../lib/plugins.js";
import { authMiddleware } from "../lib/auth.js";
import { get, set } from "../lib/cache.js";

export function registerPluginRoutes(app: express.Application): void {
	app.get("/api/plugins", authMiddleware, async (_req, res) => {
		const cacheKey = "plugins:list";
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const plugins = await getPlugins();
		set(cacheKey, plugins);
		res.json(plugins);
	});
}
