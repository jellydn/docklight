import type express from "express";
import {
	clearBuildDir,
	getDeploymentSettings,
	setBuildDir,
	setBuilder,
	setDeployBranch,
} from "../lib/deployment.js";
import { clearPrefix } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { getParam, type CommandResultLike } from "./util.js";

export function registerAppDeploymentRoutes(app: express.Application): void {
	app.get("/api/apps/:name/deployment", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const deploymentSettings = await getDeploymentSettings(name);
		if ("error" in deploymentSettings) {
			const statusCode =
				deploymentSettings.exitCode >= 400 && deploymentSettings.exitCode < 600
					? deploymentSettings.exitCode
					: 500;
			res.status(statusCode).json(deploymentSettings);
			return;
		}

		res.json(deploymentSettings);
	});

	app.put("/api/apps/:name/deployment", authMiddleware, requireOperator, async (req, res) => {
		try {
			const name = getParam(req.params, "name");
			const { deployBranch, buildDir, builder } = req.body;
			const promises: Promise<CommandResultLike>[] = [];

			if (deployBranch !== undefined) {
				if (typeof deployBranch !== "string") {
					res.status(400).json({ exitCode: 400, stderr: "deployBranch must be a string" });
					return;
				}
				promises.push(setDeployBranch(name, deployBranch));
			}
			if (buildDir !== undefined) {
				if (buildDir !== null && typeof buildDir !== "string") {
					res.status(400).json({ exitCode: 400, stderr: "buildDir must be a string or null" });
					return;
				}
				promises.push(
					buildDir === "" || buildDir === null ? clearBuildDir(name) : setBuildDir(name, buildDir)
				);
			}
			if (builder !== undefined) {
				if (typeof builder !== "string") {
					res.status(400).json({ exitCode: 400, stderr: "builder must be a string" });
					return;
				}
				promises.push(setBuilder(name, builder ?? ""));
			}

			if (promises.length === 0) {
				res.status(400).json({
					error: "At least one of deployBranch, buildDir, or builder is required",
				});
				return;
			}

			const results = await Promise.all(promises);
			const firstError = results.find((r) => r.exitCode !== 0);

			if (firstError) {
				const statusCode =
					firstError.exitCode >= 400 && firstError.exitCode < 600 ? firstError.exitCode : 500;
				res.status(statusCode).json(firstError);
				return;
			}

			clearPrefix("apps:");
			res.json(results[results.length - 1]);
		} catch (error: unknown) {
			const err = error as { message?: string };
			logger.error({ err }, "Error updating deployment settings");
			res.status(500).json({ exitCode: 1, stderr: err.message || "Unknown error" });
		}
	});
}
