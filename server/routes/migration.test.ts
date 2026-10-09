import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserById, insertAuditLog } from "../lib/db.js";
import {
	destinationSummary,
	saveMigrationDestination,
	testMigrationConnection,
} from "../lib/migration-connection.js";
import { listMigrationApps, previewMigrationApp } from "../lib/migration-preview.js";
import { registerMigrationRoutes } from "./migration.js";

vi.mock("../lib/db.js", () => ({ getUserById: vi.fn(), insertAuditLog: vi.fn() }));
vi.mock("../lib/rate-limiter.js", () => ({
	adminRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
		next(),
}));
vi.mock("../lib/migration-connection.js", () => ({
	destinationSummary: vi.fn(),
	saveMigrationDestination: vi.fn(),
	testMigrationConnection: vi.fn(),
}));
vi.mock("../lib/migration-preview.js", () => ({
	listMigrationApps: vi.fn(),
	previewMigrationApp: vi.fn(),
}));

describe("migration admin routes", () => {
	let app: express.Application;
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(getUserById).mockReturnValue({
			id: 7,
			username: "operator",
			email: null,
			role: "admin",
			createdAt: "2026-01-01",
		});
		app = express();
		app.use(express.json());
		app.use((req, _res, next) => {
			req.user = { authenticated: true, userId: 7, role: "admin" };
			next();
		});
		registerMigrationRoutes(app);
	});
	it("checks current stored role rather than trusting the token", async () => {
		vi.mocked(getUserById).mockReturnValue({
			id: 7,
			username: "operator",
			email: null,
			role: "viewer",
			createdAt: "2026-01-01",
		});
		expect((await request(app).get("/api/migration/destination")).status).toBe(403);
		expect(destinationSummary).not.toHaveBeenCalled();
	});
	it("requires a custom same-site header before changes or SSH tests", async () => {
		expect((await request(app).put("/api/migration/destination").send({})).status).toBe(403);
		expect(
			(
				await request(app)
					.post("/api/migration/test")
					.set("X-Docklight-Migration", "1")
					.set("Sec-Fetch-Site", "cross-site")
			).status
		).toBe(403);
		expect(saveMigrationDestination).not.toHaveBeenCalled();
		expect(testMigrationConnection).not.toHaveBeenCalled();
	});
	it("sets no-store and does not return endpoints or pins", async () => {
		vi.mocked(destinationSummary).mockReturnValue({
			configured: true,
			sourceConfigured: true,
			revision: "revision",
		});
		const response = await request(app).get("/api/migration/destination");
		expect(response.status).toBe(200);
		expect(response.headers["cache-control"]).toBe("no-store");
		expect(response.body).toEqual({
			configured: true,
			sourceConfigured: true,
			revision: "revision",
		});
	});
	it("records only success metadata, not endpoints or credentials", async () => {
		vi.mocked(saveMigrationDestination).mockReturnValue({
			configured: true,
			sourceConfigured: true,
			revision: "revision",
		});
		const response = await request(app)
			.put("/api/migration/destination")
			.set("X-Docklight-Migration", "1")
			.send({
				target: "operator@destination.invalid",
				fingerprint: "synthetic-pin",
				key: "must-not-be-used",
			});
		expect(response.status).toBe(200);
		expect(saveMigrationDestination).toHaveBeenCalledWith(
			"operator@destination.invalid",
			"synthetic-pin"
		);
		expect(insertAuditLog).toHaveBeenCalledWith(
			7,
			"migration:destination-save",
			null,
			'{"success":true}',
			null
		);
	});
	it("does not claim the destination is unchanged when auditing a completed save fails", async () => {
		vi.mocked(saveMigrationDestination).mockReturnValue({
			configured: true,
			sourceConfigured: true,
			revision: "new-revision",
		});
		vi.mocked(insertAuditLog).mockImplementation(() => {
			throw new Error("private storage diagnostic");
		});
		const response = await request(app)
			.put("/api/migration/destination")
			.set("X-Docklight-Migration", "1")
			.send({ target: "operator@destination.invalid", fingerprint: "synthetic-pin" });
		expect(response.body).toEqual({
			error:
				"Destination save could not be confirmed. Refresh the saved state before retrying and check server-side configuration.",
		});
	});
	it("redacts failures in both HTTP responses and audit history", async () => {
		vi.mocked(testMigrationConnection).mockRejectedValue(
			new Error("destination.invalid private-config")
		);
		const response = await request(app)
			.post("/api/migration/test")
			.set("X-Docklight-Migration", "1");
		expect(response.status).toBe(400);
		expect(JSON.stringify(response.body)).not.toMatch(/destination.invalid|private-config/);
		expect(insertAuditLog).toHaveBeenCalledWith(
			7,
			"migration:connection-test",
			null,
			'{"success":false}',
			null
		);
	});
	it("passes app selection in the body and audits no app identifiers", async () => {
		vi.mocked(listMigrationApps).mockResolvedValue(["pilot"]);
		expect(
			(await request(app).post("/api/migration/apps").set("X-Docklight-Migration", "1")).body
		).toEqual({ apps: ["pilot"] });
		const preview = {
			app: "pilot",
			destinationRevision: "revision",
			readyForSync: false as const,
			configKeyCount: 1,
			databaseServiceCount: 0,
			sharedServiceCount: 0,
			failedChecks: 0,
			blockers: ["Sync is not implemented."],
		};
		vi.mocked(previewMigrationApp).mockResolvedValue(preview);
		const response = await request(app)
			.post("/api/migration/preview")
			.set("X-Docklight-Migration", "1")
			.send({ app: "pilot", revision: "revision" });
		expect(response.body).toEqual(preview);
		expect(previewMigrationApp).toHaveBeenCalledWith("pilot", "revision", expect.any(AbortSignal));
		expect(insertAuditLog).toHaveBeenLastCalledWith(
			7,
			"migration:preview",
			null,
			'{"success":true}',
			null
		);
	});
	it("does not leak raw database errors if audit recording fails", async () => {
		vi.mocked(testMigrationConnection).mockRejectedValue(new Error("private-config"));
		vi.mocked(insertAuditLog).mockImplementation(() => {
			throw new Error("private-path");
		});
		const response = await request(app)
			.post("/api/migration/test")
			.set("X-Docklight-Migration", "1");
		expect(response.status).toBe(503);
		expect(response.body).toEqual({ error: "Migration audit storage is unavailable." });
	});
});
