import type express from "express";
import { getPlugins } from "../lib/plugins.js";
import { authMiddleware, canAccessResource } from "../lib/auth.js";
import { get, set } from "../lib/cache.js";

export function registerPluginRoutes(app: express.Application): void {
	app.get("/api/plugins", authMiddleware, async (req, res) => {
		const cacheKey = "plugins:list";
		const result =
			(get(cacheKey) as Awaited<ReturnType<typeof getPlugins>> | null) ?? (await getPlugins());

		if ("exitCode" in result && result.exitCode !== 0) {
			res.status(500).json({ error: result.error });
			return;
		}

		set(cacheKey, result);
		res.json(
			Array.isArray(result)
				? result.filter((plugin) =>
						canAccessResource(req.user, "plugins", "read", plugin.name, [
							"admin",
							"operator",
							"viewer",
						])
					)
				: result
		);
	});
}
