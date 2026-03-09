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
import { executeCommandStreaming } from "../lib/executor.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, getStatusCode, safeAuditLog, type CommandResultLike } from "./util.js";
import type { ProgressCallback } from "../lib/executor.js";

function forwardSSEEvents(sse: ReturnType<typeof createSSEWriter>): ProgressCallback {
	return (e) =>
		e.type === "progress" ? sse.sendProgress(e.message) : sse.sendOutput(e.message, e.error);
}

function sendValidationError(sse: ReturnType<typeof createSSEWriter>, message: string): void {
	sse.sendResult({
		command: "",
		exitCode: 400,
		stdout: "",
		stderr: message,
	});
	sse.close();
}

export function registerAppDeploymentRoutes(app: express.Application): void {
	app.get("/api/apps/:name/deployment", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const deploymentSettings = await getDeploymentSettings(name);
		if ("error" in deploymentSettings) {
			res.status(getStatusCode(deploymentSettings.exitCode)).json(deploymentSettings);
			return;
		}

		res.json(deploymentSettings);
	});

	app.put("/api/apps/:name/deployment", authMiddleware, requireOperator, async (req, res) => {
		try {
			const name = getParam(req.params, "name");
			const { deployBranch, buildDir, builder } = req.body;

			if (isSSERequest(req)) {
				if (!isValidAppName(name)) {
					res.status(400).json({ error: "Invalid app name" });
					return;
				}

				const sse = createSSEWriter(res);
				const auditDetails: Record<string, unknown> = {};

				try {
					if (deployBranch !== undefined) {
						if (typeof deployBranch !== "string") {
							sendValidationError(sse, "deployBranch must be a string");
							return;
						}
						sse.sendProgress(`Setting deploy branch to ${deployBranch}...`);
						const cmd = DokkuCommands.gitSetDeployBranch(name, deployBranch);
						const result = await executeCommandStreaming(cmd, forwardSSEEvents(sse), 60000);
						if (result.exitCode !== 0) {
							sse.sendResult(result);
							sse.close();
							return;
						}
						auditDetails.deployBranch = deployBranch;
					}

					if (buildDir !== undefined) {
						if (buildDir !== null && typeof buildDir !== "string") {
							sendValidationError(sse, "buildDir must be a string or null");
							return;
						}
						sse.sendProgress(
							buildDir ? `Setting build dir to ${buildDir}...` : "Clearing build dir..."
						);
						const cmd = buildDir
							? DokkuCommands.builderSetBuildDir(name, buildDir)
							: DokkuCommands.builderClearBuildDir(name);
						const result = await executeCommandStreaming(cmd, forwardSSEEvents(sse), 60000);
						if (result.exitCode !== 0) {
							sse.sendResult(result);
							sse.close();
							return;
						}
						auditDetails.buildDir = buildDir;
					}

					if (builder !== undefined) {
						if (typeof builder !== "string") {
							sendValidationError(sse, "builder must be a string");
							return;
						}
						sse.sendProgress(builder ? `Setting builder to ${builder}...` : "Clearing builder...");
						const cmd = builder
							? DokkuCommands.builderSetSelected(name, builder)
							: DokkuCommands.builderClearSelected(name);
						const result = await executeCommandStreaming(cmd, forwardSSEEvents(sse), 60000);
						if (result.exitCode !== 0) {
							sse.sendResult(result);
							sse.close();
							return;
						}
						auditDetails.builder = builder;
					}

					if (Object.keys(auditDetails).length === 0) {
						sendValidationError(
							sse,
							"At least one of deployBranch, buildDir, or builder is required"
						);
						return;
					}

					safeAuditLog(req, "deployment:update", name, auditDetails);
					clearPrefix("apps:");
					sse.sendResult({
						command: "deployment:update",
						exitCode: 0,
						stdout: "Deployment settings updated",
						stderr: "",
					});
				} catch (err) {
					sse.sendError(err instanceof Error ? err.message : "Unknown error");
				} finally {
					sse.close();
				}
				return;
			}

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
