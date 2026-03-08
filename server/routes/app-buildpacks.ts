import type express from "express";
import {
	addBuildpack,
	clearBuildpacks,
	getBuildpacks,
	removeBuildpack,
} from "../lib/buildpacks.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, handleCommandResult, getStatusCode } from "./util.js";
import { streamAction } from "./stream-util.js";

export function registerAppBuildpackRoutes(app: express.Application): void {
	app.get("/api/apps/:name/buildpacks", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const buildpacks = await getBuildpacks(name);
		if (!Array.isArray(buildpacks)) {
			res.status(getStatusCode(buildpacks.exitCode)).json(buildpacks);
			return;
		}

		res.json({ buildpacks });
	});

	app.post("/api/apps/:name/buildpacks", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { url, index } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !url) {
				res.status(400).json({ error: "Invalid app name or buildpack URL" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.buildpacksAdd(name, url, index),
				auditAction: "buildpack:add",
				appName: name,
				auditDetails: { url, index },
			});
			return;
		}

		const result = await addBuildpack(name, url, index);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/buildpacks", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { url } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !url) {
				res.status(400).json({ error: "Invalid app name or buildpack URL" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.buildpacksRemove(name, url),
				auditAction: "buildpack:remove",
				appName: name,
				auditDetails: { url },
			});
			return;
		}

		const result = await removeBuildpack(name, url);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete(
		"/api/apps/:name/buildpacks/all",
		authMiddleware,
		requireOperator,
		async (req, res) => {
			const name = getParam(req.params, "name");

			if (isSSERequest(req)) {
				if (!isValidAppName(name)) {
					res.status(400).json({ error: "Invalid app name" });
					return;
				}
				await streamAction(req, res, {
					dokkuCommand: DokkuCommands.buildpacksClear(name),
					auditAction: "buildpack:clear",
					appName: name,
				});
				return;
			}

			const result = await clearBuildpacks(name);
			if (!handleCommandResult(res, result)) return;

			clearPrefix("apps:");
			res.json(result);
		}
	);
}
