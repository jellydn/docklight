import type express from "express";
import { exportBackup, importBackup, insertAuditLog, type BackupData } from "../lib/db.js";
import { authMiddleware, requireAdmin } from "../lib/auth.js";
import { adminRateLimiter } from "../lib/rate-limiter.js";
import { getIpAddress } from "./util.js";

export function registerAdminRoutes(app: express.Application): void {
	app.get("/api/admin/backup", adminRateLimiter, authMiddleware, requireAdmin, (req, res) => {
		const backup = exportBackup();
		const filename = `docklight-backup-${new Date().toISOString().slice(0, 10)}.json`;

		// Audit log backup export
		insertAuditLog(
			req.user?.userId ?? null,
			"admin:backup",
			null,
			JSON.stringify({ filename }),
			getIpAddress(req)
		);

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
		insertAuditLog(
			req.user?.userId ?? null,
			"admin:restore",
			null,
			JSON.stringify({ version: backup.version, timestamp: backup.timestamp }),
			getIpAddress(req)
		);

		res.json({ success: true });
	});
}
