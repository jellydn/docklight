import type express from "express";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { getSettings, updateSettings, validateSettings } from "../lib/server-config.js";
import { safeAuditLog } from "./util.js";

export function registerSettingsRoutes(app: express.Application): void {
	app.get("/api/settings", authMiddleware, requireAdmin, (_req, res) => {
		const settings = getSettings();
		res.json(settings);
	});

	app.put("/api/settings", authMiddleware, requireAdmin, (req, res) => {
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

		const errors = validateSettings(updates);
		if (errors.length > 0) {
			res.status(400).json({ error: errors[0]?.message, field: errors[0]?.field });
			return;
		}

		updateSettings(updates);

		safeAuditLog(req, "settings:update", null, { fields: Object.keys(updates) });

		res.json(getSettings());
	});
}
