import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

vi.mock("../lib/db.js", () => ({
	exportBackup: vi.fn(),
	importBackup: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
	authMiddleware: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	requireAdmin: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock("../lib/rate-limiter.js", () => ({
	adminRateLimiter: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

import { exportBackup, importBackup } from "../lib/db.js";
import { registerAdminRoutes } from "./admin.js";

function createTestApp() {
	const app = express();
	app.use(express.json());
	registerAdminRoutes(app);
	return app;
}

describe("Admin routes", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		app = createTestApp();
	});

	describe("GET /api/admin/backup", () => {
		it("should return a backup JSON file with proper headers", async () => {
			const mockBackup = {
				version: "1.0",
				timestamp: "2024-01-01T00:00:00.000Z",
				users: [{ username: "admin", password_hash: "hash", role: "admin", createdAt: "" }],
				envConfig: { JWT_SECRET: true },
			};
			vi.mocked(exportBackup).mockReturnValue(mockBackup as never);

			const response = await request(app).get("/api/admin/backup");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockBackup);
			expect(response.headers["content-type"]).toContain("application/json");
			expect(response.headers["content-disposition"]).toMatch(
				/attachment; filename="docklight-backup-\d{4}-\d{2}-\d{2}\.json"/
			);
			expect(exportBackup).toHaveBeenCalledOnce();
		});
	});

	describe("POST /api/admin/restore", () => {
		it("should restore from valid backup data", async () => {
			vi.mocked(importBackup).mockReturnValue({ success: true });

			const backupData = {
				version: "1.0",
				timestamp: "2024-01-01T00:00:00.000Z",
				users: [{ username: "admin", password_hash: "hash", role: "admin", createdAt: "" }],
				envConfig: {},
			};

			const response = await request(app).post("/api/admin/restore").send(backupData);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: true });
			expect(importBackup).toHaveBeenCalledWith(backupData);
		});

		it("should return 400 when importBackup fails", async () => {
			vi.mocked(importBackup).mockReturnValue({ success: false, error: "Invalid backup format" });

			const response = await request(app).post("/api/admin/restore").send({ version: "99" });

			expect(response.status).toBe(400);
			expect(response.body).toEqual({ error: "Invalid backup format" });
		});

		it("should return 400 when backup format is invalid", async () => {
			vi.mocked(importBackup).mockReturnValue({ success: false, error: "Invalid backup format" });

			const response = await request(app)
				.post("/api/admin/restore")
				.send({ version: "99", users: "not-an-array" });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
		});

		it("should return 400 for array body", async () => {
			const response = await request(app).post("/api/admin/restore").send([]);

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
			expect(importBackup).not.toHaveBeenCalled();
		});
	});
});
