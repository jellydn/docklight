import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "../lib/db.js";

vi.mock("../lib/server.js", () => ({
	getServerHealth: vi.fn(),
	runServerCleanup: vi.fn(),
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
import { insertAuditLog } from "../lib/db.js";
import { getServerHealth, runServerCleanup } from "../lib/server.js";
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
		vi.clearAllMocks();
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
			vi.mocked(runServerCleanup).mockResolvedValue({
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
			expect(runServerCleanup).toHaveBeenCalledWith("1");
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
			expect(runServerCleanup).not.toHaveBeenCalled();
		});

		it("should return command errors on failure", async () => {
			vi.mocked(runServerCleanup).mockResolvedValue({
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
});
