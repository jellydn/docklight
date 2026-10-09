import type express from "express";
import { getUserById, insertAuditLog } from "../lib/db.js";
import { adminRateLimiter } from "../lib/rate-limiter.js";
import {
	destinationSummary,
	saveMigrationDestination,
	testMigrationConnection,
} from "../lib/migration-connection.js";

function migrationAdmin(
	req: express.Request,
	res: express.Response,
	next: express.NextFunction
): void {
	const userId = req.user?.userId;
	if (!userId || getUserById(userId)?.role !== "admin") {
		res.status(403).json({ error: "Current administrator access is required." });
		return;
	}
	res.set("Cache-Control", "no-store");
	if (
		req.method !== "GET" &&
		(req.get("X-Docklight-Migration") !== "1" || req.get("Sec-Fetch-Site") === "cross-site")
	) {
		res.status(403).json({ error: "Same-site migration request is required." });
		return;
	}
	next();
}

function audit(req: express.Request, action: string, success: boolean): void {
	insertAuditLog(req.user?.userId ?? null, action, null, JSON.stringify({ success }), null);
}

export function registerMigrationRoutes(app: express.Application): void {
	app.use("/api/migration", adminRateLimiter, migrationAdmin);
	app.get("/api/migration/destination", (_req, res) => {
		try {
			res.json(destinationSummary());
		} catch {
			res
				.status(503)
				.json({ error: "Migration storage is unavailable. Check server-side configuration." });
		}
	});
	app.put("/api/migration/destination", (req, res) => {
		try {
			const result = saveMigrationDestination(req.body?.target, req.body?.fingerprint);
			audit(req, "migration:destination-save", true);
			res.json(result);
		} catch {
			res.status(400).json({
				error:
					"Destination save could not be confirmed. Refresh the saved state before retrying and check server-side configuration.",
			});
		}
	});
	app.post("/api/migration/test", async (req, res) => {
		const controller = new AbortController();
		const cancel = (): void => {
			if (!res.writableEnded) controller.abort();
		};
		res.on("close", cancel);
		try {
			const result = await testMigrationConnection(controller.signal);
			audit(req, "migration:connection-test", true);
			res.json(result);
		} catch {
			audit(req, "migration:connection-test", false);
			if (!res.destroyed)
				res.status(400).json({
					error:
						"Read-only test failed or was cancelled. Verify pinned host keys and server-side credentials. No changes were made.",
				});
		} finally {
			res.removeListener("close", cancel);
		}
	});
}
