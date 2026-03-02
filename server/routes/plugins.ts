import type express from "express";
import {
	disablePlugin,
	enablePlugin,
	getPlugins,
	installPlugin,
	uninstallPlugin,
} from "../lib/plugins.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { getParam } from "./util.js";

export function registerPluginRoutes(app: express.Application): void {
	app.post("/api/plugins/install", authMiddleware, requireOperator, async (req, res) => {
		const { repository, name, sudoPassword } = req.body ?? {};
		const result =
			typeof sudoPassword === "string" && sudoPassword.trim().length > 0
				? await installPlugin(repository, name, sudoPassword)
				: await installPlugin(repository, name);

		if (result.exitCode === 0) {
			clearPrefix("plugins:");
		}

		res.json(result);
	});

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

	app.post("/api/plugins/:name/enable", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { sudoPassword } = req.body ?? {};
		const result =
			typeof sudoPassword === "string" && sudoPassword.trim().length > 0
				? await enablePlugin(name, sudoPassword)
				: await enablePlugin(name);

		if (result.exitCode === 0) {
			clearPrefix("plugins:");
		}

		res.json(result);
	});

	app.post("/api/plugins/:name/disable", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { sudoPassword } = req.body ?? {};
		const result =
			typeof sudoPassword === "string" && sudoPassword.trim().length > 0
				? await disablePlugin(name, sudoPassword)
				: await disablePlugin(name);

		if (result.exitCode === 0) {
			clearPrefix("plugins:");
		}

		res.json(result);
	});

	app.delete("/api/plugins/:name", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { sudoPassword } = req.body ?? {};
		const result =
			typeof sudoPassword === "string" && sudoPassword.trim().length > 0
				? await uninstallPlugin(name, sudoPassword)
				: await uninstallPlugin(name);

		if (result.exitCode === 0) {
			clearPrefix("plugins:");
		}

		res.json(result);
	});
}
