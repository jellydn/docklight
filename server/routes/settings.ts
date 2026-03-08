import type express from "express";
import { NodeSSH } from "node-ssh";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { adminRateLimiter } from "../lib/rate-limiter.js";
import { logger } from "../lib/logger.js";
import { isSSERequest, createSSEWriter } from "../lib/sse.js";
import { getSettings, updateSettings, validateSettings } from "../lib/server-config.js";
import { safeAuditLog } from "./util.js";

const DEFAULT_SSH_PORT = 22;

function parseSshTarget(target: string): { host: string; username: string; port: number } | null {
	const input = target.trim();

	if (input.startsWith("ssh://")) {
		try {
			const url = new URL(input);
			const username = url.username;
			const hostname = url.hostname;
			const host = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
			const port = url.port ? Number(url.port) : DEFAULT_SSH_PORT;
			if (!host || !username) return null;
			return { host, username, port };
		} catch {
			return null;
		}
	}

	if (!target.includes("@")) return null;
	const atIndex = target.indexOf("@");
	const username = target.slice(0, atIndex);
	let host = target.slice(atIndex + 1);
	let port = DEFAULT_SSH_PORT;

	if (host.startsWith("[")) {
		const bracketEnd = host.indexOf("]");
		if (bracketEnd > 0) {
			host = host.slice(1, bracketEnd);
			const rest = target.slice(atIndex + 1 + bracketEnd + 1);
			if (rest.startsWith(":")) {
				port = parseInt(rest.slice(1), 10);
			}
			return { host, username, port: Number.isNaN(port) ? DEFAULT_SSH_PORT : port };
		}
	}

	if (host.includes(":")) {
		const colonIndex = host.lastIndexOf(":");
		const portStr = host.slice(colonIndex + 1);
		port = parseInt(portStr, 10);
		host = host.slice(0, colonIndex);
	}

	return { host, username, port: Number.isNaN(port) ? DEFAULT_SSH_PORT : port };
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

		safeAuditLog(req, "settings:update", null, { fields: Object.keys(updates) });

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

			if (isSSERequest(req)) {
				const sse = createSSEWriter(res);
				try {
					sse.sendProgress("Connecting to SSH...");
					const ssh = new NodeSSH();
					await ssh.connect({
						host: parsed.host,
						port: parsed.port,
						username: parsed.username,
						privateKeyPath: keyPath || undefined,
						readyTimeout: 15000,
					});
					sse.sendProgress("Testing command execution...");
					const result = await ssh.execCommand("echo 'connection-ok'");
					ssh.dispose();

					if (result.code === 0 && result.stdout.trim() === "connection-ok") {
						sse.sendResult({
							command: "ssh test",
							exitCode: 0,
							stdout: "SSH connection successful",
							stderr: "",
						});
						safeAuditLog(req, "settings:test-connection", null, { target, success: true });
					} else {
						sse.sendError(result.stderr || "Command execution failed");
						sse.sendResult({
							command: "ssh test",
							exitCode: result.code || 1,
							stdout: "",
							stderr: result.stderr || "Command execution failed",
						});
						safeAuditLog(req, "settings:test-connection", null, { target, success: false });
					}
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : "Connection failed";
					logger.error({ err, target }, "SSH connection test failed");
					sse.sendError(errorMessage);
					sse.sendResult({
						command: "ssh test",
						exitCode: 1,
						stdout: "",
						stderr: errorMessage,
					});
					safeAuditLog(req, "settings:test-connection", null, {
						target,
						success: false,
						error: errorMessage,
					});
				}
			} else {
				try {
					const ssh = new NodeSSH();
					await ssh.connect({
						host: parsed.host,
						port: parsed.port,
						username: parsed.username,
						privateKeyPath: keyPath || undefined,
						readyTimeout: 15000,
					});
					const result = await ssh.execCommand("echo 'connection-ok'");
					ssh.dispose();

					if (result.code === 0 && result.stdout.trim() === "connection-ok") {
						res.json({ success: true, message: "SSH connection successful" });
					} else {
						res
							.status(400)
							.json({ success: false, error: result.stderr || "Command execution failed" });
					}
					safeAuditLog(req, "settings:test-connection", null, {
						target,
						success: result.code === 0,
					});
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : "Connection failed";
					logger.error({ err, target }, "SSH connection test failed");
					res.status(400).json({ success: false, error: errorMessage });
					safeAuditLog(req, "settings:test-connection", null, {
						target,
						success: false,
						error: errorMessage,
					});
				}
			}
		}
	);
}
