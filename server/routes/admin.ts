import type express from "express";
import { exportBackup, importBackup, type BackupData } from "../lib/db.js";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { adminRateLimiter } from "../lib/rate-limiter.js";
import { auditLog } from "./util.js";

export function registerAdminRoutes(app: express.Application): void {
	app.get("/api/admin/backup", adminRateLimiter, authMiddleware, requireAdmin, (req, res) => {
		const backup = exportBackup();
		const filename = `docklight-backup-${new Date().toISOString().slice(0, 10)}.json`;

		auditLog(req, "admin:backup", null, { filename });

		res.setHeader("Content-Type", "application/json");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		res.json(backup);
	});

	app.post("/api/admin/restore", adminRateLimiter, authMiddleware, requireAdmin, (req, res) => {
		const backup = req.body as BackupData;

		if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
			res.status(400).json({ error: "Invalid backup data" });
			return;
		}

		const result = importBackup(backup);

		if (!result.success) {
			res.status(400).json({ error: result.error });
			return;
		}

		// Audit log backup restore
		auditLog(req, "admin:restore", null, { version: backup.version, timestamp: backup.timestamp });

		res.json({ success: true });
	});
}
