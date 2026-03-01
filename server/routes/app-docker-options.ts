import type express from "express";
import {
	addDockerOption,
	clearDockerOptions,
	getDockerOptions,
	removeDockerOption,
} from "../lib/docker-options.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware } from "../lib/auth.js";
import { getParam, handleCommandResult } from "./util.js";

export function registerAppDockerOptionsRoutes(app: express.Application): void {
	app.get("/api/apps/:name/docker-options", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const dockerOptions = await getDockerOptions(name);
		if ("error" in dockerOptions) {
			const statusCode =
				dockerOptions.exitCode >= 400 && dockerOptions.exitCode < 600
					? dockerOptions.exitCode
					: 500;
			res.status(statusCode).json(dockerOptions);
			return;
		}

		res.json(dockerOptions);
	});

	app.post("/api/apps/:name/docker-options", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { phase, option } = req.body;

		const result = await addDockerOption(name, phase, option);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/docker-options", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { phase, option } = req.body;

		const result = await removeDockerOption(name, phase, option);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/docker-options/all", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { phase } = req.body;

		const result = await clearDockerOptions(name, phase);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});
}
