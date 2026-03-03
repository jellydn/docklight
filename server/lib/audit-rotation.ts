import { deleteOldAuditLogs, deleteOldCommandHistory } from "./db.js";
import { logger } from "./logger.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

let rotationTimer: ReturnType<typeof setInterval> | null = null;

function getRetentionDays(): number {
	const parsed = Number.parseInt(process.env.DOCKLIGHT_AUDIT_RETENTION_DAYS ?? "90", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
}

export function runAuditRotation(): { deletedLogs: number; deletedCommands: number } {
	const retentionDays = getRetentionDays();
	const deletedLogs = deleteOldAuditLogs(retentionDays);
	const deletedCommands = deleteOldCommandHistory(retentionDays);
	if (deletedLogs > 0 || deletedCommands > 0) {
		logger.info({ deletedLogs, deletedCommands, retentionDays }, "Audit log rotation completed");
	}
	return { deletedLogs, deletedCommands };
}

export function startAuditRotation(): void {
	if (rotationTimer) return;
	try {
		runAuditRotation();
	} catch (err) {
		logger.error({ err }, "Audit log rotation failed during immediate run");
	}
	rotationTimer = setInterval(() => {
		try {
			runAuditRotation();
		} catch (err) {
			logger.error({ err }, "Audit log rotation failed during scheduled run");
		}
	}, MS_PER_DAY);
}

export function stopAuditRotation(): void {
	if (rotationTimer) {
		clearInterval(rotationTimer);
		rotationTimer = null;
	}
}
