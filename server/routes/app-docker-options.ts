import type express from "express";
import {
	addDockerOption,
	clearDockerOptions,
	getDockerOptions,
	removeDockerOption,
} from "../lib/docker-options.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, handleCommandResult, getStatusCode } from "./util.js";
import { streamAction } from "./stream-util.js";

export function registerAppDockerOptionsRoutes(app: express.Application): void {
	app.get("/api/apps/:name/docker-options", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const dockerOptions = await getDockerOptions(name);
		if ("error" in dockerOptions) {
			res.status(getStatusCode(dockerOptions.exitCode)).json(dockerOptions);
			return;
		}

		res.json(dockerOptions);
	});

	app.post("/api/apps/:name/docker-options", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { phase, option } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !phase || !option) {
				res.status(400).json({ error: "Invalid app name, phase, or option" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.dockerOptionsAdd(name, phase, option),
				auditAction: "docker-options:add",
				appName: name,
				auditDetails: { phase, option },
			});
			return;
		}

		const result = await addDockerOption(name, phase, option);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete(
		"/api/apps/:name/docker-options",
		authMiddleware,
		requireOperator,
		async (req, res) => {
			const name = getParam(req.params, "name");
			const { phase, option } = req.body;

			if (isSSERequest(req)) {
				if (!isValidAppName(name) || !phase || !option) {
					res.status(400).json({ error: "Invalid app name, phase, or option" });
					return;
				}
				await streamAction(req, res, {
					dokkuCommand: DokkuCommands.dockerOptionsRemove(name, phase, option),
					auditAction: "docker-options:remove",
					appName: name,
					auditDetails: { phase, option },
				});
				return;
			}

			const result = await removeDockerOption(name, phase, option);
			if (!handleCommandResult(res, result)) return;

			clearPrefix("apps:");
			res.json(result);
		}
	);

	app.delete(
		"/api/apps/:name/docker-options/all",
		authMiddleware,
		requireOperator,
		async (req, res) => {
			const name = getParam(req.params, "name");
			const { phase } = req.body;

			if (isSSERequest(req)) {
				if (!isValidAppName(name) || !phase) {
					res.status(400).json({ error: "Invalid app name or phase" });
					return;
				}
				await streamAction(req, res, {
					dokkuCommand: DokkuCommands.dockerOptionsClear(name, phase),
					auditAction: "docker-options:clear",
					appName: name,
					auditDetails: { phase },
				});
				return;
			}

			const result = await clearDockerOptions(name, phase);
			if (!handleCommandResult(res, result)) return;

			clearPrefix("apps:");
			res.json(result);
		}
	);
}
