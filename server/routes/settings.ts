import type express from "express";
import { NodeSSH } from "node-ssh";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { adminRateLimiter } from "../lib/rate-limiter.js";
import { logger } from "../lib/logger.js";
import type { ParsedSshTarget } from "../lib/ssh-target.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import { getSettings, updateSettings, validateSettings } from "../lib/server-config.js";
import { parseSshTarget } from "../lib/ssh-target.js";
import { safeAuditLog } from "./util.js";

interface SshTestResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
}

async function testSshConnection(
	parsed: ParsedSshTarget,
	keyPath?: string
): Promise<SshTestResult> {
	const ssh = new NodeSSH();
	try {
		await ssh.connect({
			host: parsed.host,
			port: parsed.port,
			username: parsed.username,
			privateKeyPath: keyPath || undefined,
			readyTimeout: 15000,
		});
		const result = await ssh.execCommand("echo 'connection-ok'");

		const ok = result.code === 0 && result.stdout.trim() === "connection-ok";
		return {
			success: ok,
			stdout: ok ? "SSH connection successful" : "",
			stderr: ok ? "" : result.stderr || "Command execution failed",
			exitCode: result.code ?? 1,
		};
	} finally {
		ssh.dispose();
	}
}

export function registerSettingsRoutes(app: express.Application): void {
	app.get("/api/settings", adminRateLimiter, authMiddleware, requireAdmin, (_req, res) => {
		const settings = getSettings();
		res.json(settings);
	});

	app.put("/api/settings", adminRateLimiter, authMiddleware, requireAdmin, (req, res) => {
		const body = req.body as Record<string, unknown>;

		if (!body || typeof body !== "object" || Array.isArray(body)) {
			res.status(400).json({ error: "Request body must be an object" });
			return;
		}

		const updates: Record<string, string> = {};
		const allowedFields = ["dokkuSshTarget", "dokkuSshKeyPath", "logLevel"];

		for (const field of allowedFields) {
			if (field in body) {
				const value = body[field];
				if (typeof value !== "string") {
					res.status(400).json({ error: `Field '${field}' must be a string` });
					return;
				}
				updates[field] = value;
			}
		}

		if (Object.keys(updates).length === 0) {
			res.status(400).json({ error: "No valid settings fields provided" });
			return;
		}

		const errors = validateSettings(updates);
		if (errors.length > 0) {
			res.status(400).json({ error: errors[0]?.message, field: errors[0]?.field });
			return;
		}

		updateSettings(updates);

		safeAuditLog(req, "settings:update", null, {
			fields: Object.keys(updates),
		});

		res.json(getSettings());
	});

	app.post(
		"/api/settings/test-connection",
		adminRateLimiter,
		authMiddleware,
		requireAdmin,
		async (req, res) => {
			const body = req.body as { target?: string; keyPath?: string };
			const target = body.target?.trim();
			const keyPath = body.keyPath?.trim();

			if (!target) {
				res.status(400).json({ error: "SSH target is required" });
				return;
			}

			const parsed = parseSshTarget(target);
			if (!parsed) {
				res.status(400).json({ error: "Invalid SSH target format" });
				return;
			}

			const sse = isSSERequest(req) ? createSSEWriter(res) : null;

			try {
				if (sse) {
					sse.sendProgress("Connecting to SSH...");
					const result = await testSshConnection(parsed, keyPath);
					if (result.success) {
						sse.sendResult({ command: "ssh test", exitCode: 0, stdout: result.stdout, stderr: "" });
					} else {
						sse.sendError(result.stderr);
						sse.sendResult({
							command: "ssh test",
							exitCode: result.exitCode,
							stdout: "",
							stderr: result.stderr,
						});
					}
					safeAuditLog(req, "settings:test-connection", null, { target, success: result.success });
				} else {
					const result = await testSshConnection(parsed, keyPath);
					if (result.success) {
						res.json({ success: true, message: result.stdout });
					} else {
						res.status(400).json({ success: false, error: result.stderr });
					}
					safeAuditLog(req, "settings:test-connection", null, { target, success: result.success });
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Connection failed";
				logger.error({ err, target }, "SSH connection test failed");
				if (sse) {
					sse.sendError(errorMessage);
					sse.sendResult({ command: "ssh test", exitCode: 1, stdout: "", stderr: errorMessage });
				} else {
					res.status(400).json({ success: false, error: errorMessage });
				}
				safeAuditLog(req, "settings:test-connection", null, {
					target,
					success: false,
					error: errorMessage,
				});
			}
		}
	);
}
