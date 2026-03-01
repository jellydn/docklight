import type express from "express";
import {
	addBuildpack,
	clearBuildpacks,
	getBuildpacks,
	removeBuildpack,
} from "../lib/buildpacks.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware } from "../lib/auth.js";
import { getParam, handleCommandResult } from "./util.js";

export function registerAppBuildpackRoutes(app: express.Application): void {
	app.get("/api/apps/:name/buildpacks", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const buildpacks = await getBuildpacks(name);
		if (!Array.isArray(buildpacks)) {
			const statusCode =
				buildpacks.exitCode >= 400 && buildpacks.exitCode < 600 ? buildpacks.exitCode : 500;
			res.status(statusCode).json(buildpacks);
			return;
		}

		res.json({ buildpacks });
	});

	app.post("/api/apps/:name/buildpacks", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { url, index } = req.body;

		const result = await addBuildpack(name, url, index);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/buildpacks", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { url } = req.body;

		const result = await removeBuildpack(name, url);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/buildpacks/all", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await clearBuildpacks(name);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});
}
