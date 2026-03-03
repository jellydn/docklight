import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/db.js", () => ({
	getAuditLogs: vi.fn(),
	getRecentCommands: vi.fn(),
	getUserAuditLogs: vi.fn(),
	getCommandHistoryForExport: vi.fn(),
	getUserAuditLogsForExport: vi.fn(),
	insertAuditLog: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
	authMiddleware: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	requireAdmin: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock("../lib/cache.js", () => ({
	get: vi.fn().mockReturnValue(null),
	set: vi.fn(),
}));

vi.mock("../lib/rate-limiter.js", () => ({
	adminRateLimiter: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock("../lib/audit-rotation.js", () => ({
	runAuditRotation: vi.fn().mockReturnValue({ deletedLogs: 5, deletedCommands: 3 }),
}));

import { runAuditRotation } from "../lib/audit-rotation.js";
import { getCommandHistoryForExport, getUserAuditLogsForExport } from "../lib/db.js";
import { registerCommandRoutes } from "./commands.js";

function createTestApp() {
	const app = express();
	app.use(express.json());
	registerCommandRoutes(app);
	return app;
}

const mockCommandLogs = [
	{
		id: 1,
		command: "dokku apps:list",
		exitCode: 0,
		stdout: "my-app",
		stderr: "",
		createdAt: "2024-01-15T10:30:00Z",
	},
	{
		id: 2,
		command: "dokku ps:restart my-app",
		exitCode: 1,
		stdout: "",
		stderr: "Error",
		createdAt: "2024-01-15T10:31:00Z",
	},
];

const mockUserLogs = [
	{
		id: 1,
		userId: 1,
		action: "login",
		resource: null,
		details: null,
		ipAddress: "192.168.1.1",
		createdAt: "2024-01-15T10:30:00Z",
	},
];

describe("Command routes - export endpoint", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		app = createTestApp();
	});

	describe("GET /api/audit/export", () => {
		it("should return command history as JSON by default", async () => {
			vi.mocked(getCommandHistoryForExport).mockReturnValue(mockCommandLogs as never);

			const response = await request(app).get("/api/audit/export?type=commands&format=json");

			expect(response.status).toBe(200);
			expect(response.headers["content-type"]).toContain("application/json");
			expect(response.headers["content-disposition"]).toMatch(
				/attachment; filename="docklight-audit-commands-\d{4}-\d{2}-\d{2}\.json"/
			);
			expect(response.body).toEqual(mockCommandLogs);
		});

		it("should return command history as CSV", async () => {
			vi.mocked(getCommandHistoryForExport).mockReturnValue(mockCommandLogs as never);

			const response = await request(app).get("/api/audit/export?type=commands&format=csv");

			expect(response.status).toBe(200);
			expect(response.headers["content-type"]).toContain("text/csv");
			expect(response.headers["content-disposition"]).toMatch(
				/attachment; filename="docklight-audit-commands-\d{4}-\d{2}-\d{2}\.csv"/
			);
			expect(response.text).toContain("id,command,exitCode,stdout,stderr,createdAt");
			expect(response.text).toContain("dokku apps:list");
		});

		it("should return user audit logs as JSON", async () => {
			vi.mocked(getUserAuditLogsForExport).mockReturnValue(mockUserLogs as never);

			const response = await request(app).get("/api/audit/export?type=users&format=json");

			expect(response.status).toBe(200);
			expect(response.headers["content-type"]).toContain("application/json");
			expect(response.body).toEqual(mockUserLogs);
		});

		it("should return user audit logs as CSV", async () => {
			vi.mocked(getUserAuditLogsForExport).mockReturnValue(mockUserLogs as never);

			const response = await request(app).get("/api/audit/export?type=users&format=csv");

			expect(response.status).toBe(200);
			expect(response.headers["content-type"]).toContain("text/csv");
			expect(response.text).toContain("id,userId,action,resource,details,ipAddress,createdAt");
			expect(response.text).toContain("login");
		});

		it("should default to commands type and json format", async () => {
			vi.mocked(getCommandHistoryForExport).mockReturnValue([] as never);

			const response = await request(app).get("/api/audit/export");

			expect(response.status).toBe(200);
			expect(getCommandHistoryForExport).toHaveBeenCalledOnce();
		});

		it("should return 400 for invalid type", async () => {
			const response = await request(app).get("/api/audit/export?type=invalid");

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
		});

		it("should return 400 for invalid format", async () => {
			const response = await request(app).get("/api/audit/export?type=commands&format=xml");

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
		});

		it("should return 400 for invalid exitCode filter", async () => {
			const response = await request(app).get("/api/audit/export?type=commands&exitCode=invalid");

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
		});

		it("should return 400 for invalid userId filter in users export", async () => {
			const response = await request(app).get("/api/audit/export?type=users&userId=notanumber");

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
		});

		it("should pass date range filters to getCommandHistoryForExport", async () => {
			vi.mocked(getCommandHistoryForExport).mockReturnValue([] as never);

			await request(app).get(
				"/api/audit/export?type=commands&startDate=2024-01-01&endDate=2024-01-31"
			);

			expect(getCommandHistoryForExport).toHaveBeenCalledWith(
				expect.objectContaining({ startDate: "2024-01-01", endDate: "2024-01-31" })
			);
		});

		it("should pass filters to getUserAuditLogsForExport", async () => {
			vi.mocked(getUserAuditLogsForExport).mockReturnValue([] as never);

			await request(app).get(
				"/api/audit/export?type=users&userId=1&action=login&startDate=2024-01-01"
			);

			expect(getUserAuditLogsForExport).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 1, action: "login", startDate: "2024-01-01" })
			);
		});

		it("should handle CSV with special characters", async () => {
			const logsWithCommas = [
				{
					id: 1,
					command: 'dokku config:set my-app KEY="value,with,commas"',
					exitCode: 0,
					stdout: "Set key",
					stderr: "",
					createdAt: "2024-01-15T10:30:00Z",
				},
			];
			vi.mocked(getCommandHistoryForExport).mockReturnValue(logsWithCommas as never);

			const response = await request(app).get("/api/audit/export?type=commands&format=csv");

			expect(response.status).toBe(200);
			expect(response.text).toContain('"dokku config:set my-app KEY=');
		});
	});

	describe("POST /api/audit/rotate", () => {
		it("should trigger rotation and return counts", async () => {
			const response = await request(app).post("/api/audit/rotate");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ success: true, deletedLogs: 5, deletedCommands: 3 });
			expect(runAuditRotation).toHaveBeenCalledOnce();
		});
	});
});
