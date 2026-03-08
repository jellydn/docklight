import type express from "express";
import { enableSSL, getSSL, renewSSL } from "../lib/ssl.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { executeCommandStreaming } from "../lib/executor.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, safeAuditLog } from "./util.js";
import { streamAction } from "./stream-util.js";
import type { ProgressCallback } from "../lib/executor.js";

function forwardSSEEvents(sse: ReturnType<typeof createSSEWriter>): ProgressCallback {
	return (event) => {
		if (event.type === "progress") {
			sse.sendProgress(event.message);
		} else {
			sse.sendOutput(event.message, event.error);
		}
	};
}

export function registerAppSSLRoutes(app: express.Application): void {
	app.get("/api/apps/:name/ssl", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const ssl = await getSSL(name);
		res.json(ssl);
	});

	app.post("/api/apps/:name/ssl/enable", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { email } = req.body ?? {};

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			const normalizedEmail = typeof email === "string" ? email.trim() : "";
			if (normalizedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
				res.status(400).json({ error: "Invalid email address" });
				return;
			}

			const sse = createSSEWriter(res);
			try {
				if (normalizedEmail.length > 0) {
					sse.sendProgress("Setting email...");
					const emailResult = await executeCommandStreaming(
						DokkuCommands.letsencryptSetEmail(name, normalizedEmail),
						forwardSSEEvents(sse),
						60000
					);
					if (emailResult.exitCode !== 0) {
						sse.sendResult(emailResult);
						sse.close();
						return;
					}
				}

				sse.sendProgress("Enabling SSL...");
				const result = await executeCommandStreaming(
					DokkuCommands.letsencryptEnable(name),
					forwardSSEEvents(sse),
					120000
				);

				if (result.exitCode === 0) {
					safeAuditLog(req, "ssl:enable", name, { app: name });
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

		const result =
			typeof email === "string" && email.trim().length > 0
				? await enableSSL(name, email)
				: await enableSSL(name);
		res.json(result);
	});

	app.post("/api/apps/:name/ssl/renew", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.letsencryptAutoRenew(name),
				auditAction: "ssl:renew",
				appName: name,
				timeout: 120000,
			});
			return;
		}

		const result = await renewSSL(name);
		res.json(result);
	});
}
