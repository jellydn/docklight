import type express from "express";
import { getGitInfo, syncFromRepo } from "../lib/git.js";
import { clearPrefix } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
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

			const result = await syncFromRepo(name, repo, branch);
			if (!handleCommandResult(res, result)) return;

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
