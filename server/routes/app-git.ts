import type express from "express";
import { getGitInfo, isValidRepoUrl, syncFromRepo } from "../lib/git.js";
import { isValidAppName } from "../lib/apps.js";
import { clearPrefix } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { executeCommandStreaming } from "../lib/executor.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import { getParam, handleCommandResult, safeAuditLog } from "./util.js";

export function registerAppGitRoutes(app: express.Application): void {
	app.get("/api/apps/:name/git", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const gitInfo = await getGitInfo(name);
		if ("error" in gitInfo) {
			handleCommandResult(res, gitInfo);
			return;
		}
		res.json(gitInfo);
	});

	app.post("/api/apps/:name/git/sync", authMiddleware, requireOperator, async (req, res) => {
		try {
			const name = getParam(req.params, "name");

			if (typeof req.body !== "object" || req.body === null) {
				res.status(400).json({ exitCode: 400, stderr: "request body must be a JSON object" });
				return;
			}

			const { repo, branch } = req.body as { repo?: unknown; branch?: unknown };

			if (!repo || typeof repo !== "string") {
				res.status(400).json({ exitCode: 400, stderr: "repo must be a non-empty string" });
				return;
			}

			if (branch !== undefined && typeof branch !== "string") {
				res.status(400).json({ exitCode: 400, stderr: "branch must be a string" });
				return;
			}

			const sanitizeRepoUrl = (url: string): string => {
				try {
					const urlObj = new URL(url);
					urlObj.username = "";
					urlObj.password = "";
					urlObj.search = "";
					return urlObj.toString();
				} catch {
					return url.replace(/\/\/[^@]+@/, "//[REDACTED]@").split("?")[0];
				}
			};

			if (isSSERequest(req)) {
				if (!isValidAppName(name)) {
					res.status(400).json({ error: "Invalid app name" });
					return;
				}
				if (!isValidRepoUrl(repo.trim())) {
					res.status(400).json({ error: "Invalid repository URL" });
					return;
				}

				const { execCommand } = DokkuCommands.gitSync(
					name,
					repo.trim(),
					branch as string | undefined
				);
				const sse = createSSEWriter(res);
				try {
					const result = await executeCommandStreaming(
						execCommand,
						(event) => {
							if (event.type === "progress") {
								sse.sendProgress(event.message);
							} else {
								sse.sendOutput(event.message, event.error);
							}
						},
						120000
					);

					if (result.exitCode === 0) {
						const sanitizedRepo = sanitizeRepoUrl(repo);
						safeAuditLog(req, "app:git:sync", name, {
							repo: sanitizedRepo,
							branch: branch || null,
						});
						clearPrefix("apps:");
					}
					sse.sendResult(result);
				} catch (err) {
					sse.sendError(err instanceof Error ? err.message : "Unknown error");
				} finally {
					sse.close();
				}
				return;
			}

			const result = await syncFromRepo(name, repo, branch);
			if (!handleCommandResult(res, result)) return;

			const sanitizedRepo = sanitizeRepoUrl(repo);
			safeAuditLog(req, "app:git:sync", name, { repo: sanitizedRepo, branch: branch || null });
			clearPrefix("apps:");
			res.json(result);
		} catch (error: unknown) {
			const err = error as { message?: string };
			logger.error({ err }, "Error syncing app from git repo");
			res.status(500).json({ exitCode: 1, stderr: err.message || "Unknown error" });
		}
	});
}
