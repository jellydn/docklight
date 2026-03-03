import type express from "express";
import { executeCommand } from "../lib/executor.js";
import { pingDb } from "../lib/db.js";

const parsedTimeout = Number.parseInt(process.env.DOCKLIGHT_HEALTH_CHECK_TIMEOUT_MS ?? "", 10);
const HEALTH_CHECK_TIMEOUT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 5000;

export function registerHealthRoutes(app: express.Application): void {
	app.get("/api/health", async (_req, res) => {
		const checks: { dokku: string; database: string } = {
			dokku: "ok",
			database: "ok",
		};

		try {
			pingDb();
		} catch {
			checks.database = "error";
		}

		try {
			const dokkuResult = await executeCommand("dokku version", HEALTH_CHECK_TIMEOUT_MS, { skipHistory: true });
			if (dokkuResult.exitCode !== 0) {
				checks.dokku = "error";
			}
		} catch {
			checks.dokku = "error";
		}

		const status = Object.values(checks).every((v) => v === "ok") ? "healthy" : "unhealthy";
		res.status(status === "healthy" ? 200 : 503).json({ status, checks });
	});
}
