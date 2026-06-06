import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "../lib/db.js";

vi.mock("../lib/server.js", () => ({
	getServerHealth: vi.fn(),
}));

vi.mock("../lib/executor.js", () => ({
	executeCommand: vi.fn(),
}));

vi.mock("../lib/db.js", () => ({
	insertAuditLog: vi.fn(),
}));

vi.mock("../lib/cache.js", () => ({
	get: vi.fn().mockReturnValue(undefined),
	set: vi.fn(),
	del: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
	authMiddleware: vi.fn((req: Request, _res: Response, next: NextFunction) => {
		const role = (req.headers["x-test-role"] as UserRole | undefined) ?? "admin";
		req.user = { authenticated: true, userId: 1, username: "test-user", role };
		next();
	}),
	requireOperator: vi.fn((req: Request, res: Response, next: NextFunction) => {
		const role = req.user?.role;
		if (role !== "admin" && role !== "operator") {
			res.status(403).json({ error: "Forbidden" });
			return;
		}
		next();
	}),
}));

import { del, get, set } from "../lib/cache.js";
import { executeCommand } from "../lib/executor.js";
import { insertAuditLog } from "../lib/db.js";
import { getServerHealth } from "../lib/server.js";
import { registerServerRoutes } from "./server.js";

function createTestApp() {
	const app = express();
	app.use(express.json());
	registerServerRoutes(app);
	return app;
}

const healthyResponse = {
	cpu: 12,
	memory: 70,
	disk: 97,
	status: "critical" as const,
	resources: {
		cpu: { value: 12, status: "ok" as const },
		memory: { value: 70, status: "warning" as const },
		disk: { value: 97, status: "critical" as const },
	},
};

describe("Server routes", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(executeCommand).mockReset();
		vi.mocked(get).mockReturnValue(undefined);
		app = createTestApp();
	});

	describe("GET /api/server/health", () => {
		it("should return health with resource statuses", async () => {
			vi.mocked(getServerHealth).mockResolvedValue(healthyResponse);

			const response = await request(app).get("/api/server/health");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(healthyResponse);
			expect(set).toHaveBeenCalledWith("server:health", healthyResponse);
		});

		it("should return cached health when available", async () => {
			vi.mocked(get).mockReturnValue(healthyResponse);

			const response = await request(app).get("/api/server/health");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(healthyResponse);
			expect(getServerHealth).not.toHaveBeenCalled();
		});
	});

	describe("POST /api/server/cleanup", () => {
		it("should run dokku cleanup for operators", async () => {
			vi.mocked(executeCommand).mockResolvedValue({
				command: "dokku cleanup",
				exitCode: 0,
				stdout: "Cleanup complete",
				stderr: "",
			});

			const response = await request(app)
				.post("/api/server/cleanup")
				.set("x-test-role", "operator");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				command: "dokku cleanup",
				exitCode: 0,
				stdout: "Cleanup complete",
				stderr: "",
			});
			expect(executeCommand).toHaveBeenCalledWith("dokku cleanup", 120000, { userId: "1" });
			expect(insertAuditLog).toHaveBeenCalledWith(
				1,
				"server:cleanup",
				null,
				null,
				expect.any(String)
			);
			expect(del).toHaveBeenCalledWith("server:health");
		});

		it("should reject viewers", async () => {
			const response = await request(app).post("/api/server/cleanup").set("x-test-role", "viewer");

			expect(response.status).toBe(403);
			expect(response.body).toEqual({ error: "Forbidden" });
			expect(executeCommand).not.toHaveBeenCalled();
		});

		it("should return command errors on failure", async () => {
			vi.mocked(executeCommand).mockResolvedValue({
				command: "dokku cleanup",
				exitCode: 1,
				stdout: "",
				stderr: "cleanup failed",
			});

			const response = await request(app).post("/api/server/cleanup");

			expect(response.status).toBe(500);
			expect(response.body).toEqual({
				command: "dokku cleanup",
				exitCode: 1,
				stdout: "",
				stderr: "cleanup failed",
			});
			expect(insertAuditLog).not.toHaveBeenCalled();
			expect(del).not.toHaveBeenCalled();
		});
	});

	describe("POST /api/server/purge-cache", () => {
		it("should purge all app caches for operators", async () => {
			vi.mocked(executeCommand)
				.mockResolvedValueOnce({
					command: "dokku --quiet apps:list",
					exitCode: 0,
					stdout: "app-one\napp-two",
					stderr: "",
				})
				.mockResolvedValueOnce({
					command: "dokku repo:purge-cache app-one",
					exitCode: 0,
					stdout: "Purged app-one",
					stderr: "",
				})
				.mockResolvedValueOnce({
					command: "dokku repo:purge-cache app-two",
					exitCode: 0,
					stdout: "Purged app-two",
					stderr: "",
				});

			const response = await request(app)
				.post("/api/server/purge-cache")
				.set("x-test-role", "operator");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				command: "dokku repo:purge-cache --all-apps",
				exitCode: 0,
				stdout: "Purged app-one\nPurged app-two",
				stderr: "",
				results: [
					{
						app: "app-one",
						command: "dokku repo:purge-cache app-one",
						exitCode: 0,
						stdout: "Purged app-one",
						stderr: "",
					},
					{
						app: "app-two",
						command: "dokku repo:purge-cache app-two",
						exitCode: 0,
						stdout: "Purged app-two",
						stderr: "",
					},
				],
			});
			expect(executeCommand).toHaveBeenCalledTimes(3);
			expect(executeCommand).toHaveBeenNthCalledWith(1, "dokku --quiet apps:list", 30000, {
				userId: "1",
			});
			expect(executeCommand).toHaveBeenNthCalledWith(2, "dokku repo:purge-cache app-one", 120000, {
				userId: "1",
			});
			expect(executeCommand).toHaveBeenNthCalledWith(3, "dokku repo:purge-cache app-two", 120000, {
				userId: "1",
			});
			expect(insertAuditLog).toHaveBeenCalledWith(
				1,
				"server:purge-cache",
				null,
				null,
				expect.any(String)
			);
			expect(del).toHaveBeenCalledWith("server:health");
		});

		it("should reject viewers", async () => {
			const response = await request(app)
				.post("/api/server/purge-cache")
				.set("x-test-role", "viewer");

			expect(response.status).toBe(403);
			expect(response.body).toEqual({ error: "Forbidden" });
			expect(executeCommand).not.toHaveBeenCalled();
		});

		it("should return an error when app listing fails without running purge commands", async () => {
			vi.mocked(executeCommand)
				.mockResolvedValueOnce({
					command: "dokku --quiet apps:list",
					exitCode: 1,
					stdout: "",
					stderr: "quiet list failed",
				})
				.mockResolvedValueOnce({
					command: "dokku apps:list",
					exitCode: 1,
					stdout: "",
					stderr: "apps list failed",
				});

			const response = await request(app).post("/api/server/purge-cache");

			expect(response.status).toBe(500);
			expect(response.body).toEqual({
				command: "dokku repo:purge-cache --all-apps",
				exitCode: 1,
				stdout: "",
				stderr: "apps list failed",
				results: [],
			});
			expect(executeCommand).toHaveBeenCalledTimes(2);
			expect(insertAuditLog).not.toHaveBeenCalled();
			expect(del).not.toHaveBeenCalled();
		});

		it("should return aggregate failure when one app purge fails", async () => {
			vi.mocked(executeCommand)
				.mockResolvedValueOnce({
					command: "dokku --quiet apps:list",
					exitCode: 0,
					stdout: "app-one\napp-two",
					stderr: "",
				})
				.mockResolvedValueOnce({
					command: "dokku repo:purge-cache app-one",
					exitCode: 0,
					stdout: "Purged app-one",
					stderr: "",
				})
				.mockResolvedValueOnce({
					command: "dokku repo:purge-cache app-two",
					exitCode: 1,
					stdout: "",
					stderr: "purge failed",
				});

			const response = await request(app).post("/api/server/purge-cache");

			expect(response.status).toBe(500);
			expect(response.body).toEqual({
				command: "dokku repo:purge-cache --all-apps",
				exitCode: 1,
				stdout: "Purged app-one",
				stderr: "purge failed",
				results: [
					{
						app: "app-one",
						command: "dokku repo:purge-cache app-one",
						exitCode: 0,
						stdout: "Purged app-one",
						stderr: "",
					},
					{
						app: "app-two",
						command: "dokku repo:purge-cache app-two",
						exitCode: 1,
						stdout: "",
						stderr: "purge failed",
					},
				],
			});
			expect(insertAuditLog).not.toHaveBeenCalled();
			expect(del).not.toHaveBeenCalled();
		});
	});
});
