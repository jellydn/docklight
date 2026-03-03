import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../lib/executor.js", () => ({
	executeCommand: vi.fn(),
}));

vi.mock("../lib/db.js", () => ({
	pingDb: vi.fn(),
}));

import { executeCommand } from "../lib/executor.js";
import { pingDb } from "../lib/db.js";
import { registerHealthRoutes } from "./health.js";

function createTestApp() {
	const app = express();
	app.use(express.json());
	registerHealthRoutes(app);
	return app;
}

describe("Health routes", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		app = createTestApp();
	});

	describe("GET /api/health", () => {
		it("should return 200 with healthy status when all checks pass", async () => {
			vi.mocked(pingDb).mockReturnValue(undefined);
			vi.mocked(executeCommand).mockResolvedValue({
				command: "dokku version",
				exitCode: 0,
				stdout: "dokku version 0.34.0",
				stderr: "",
			});

			const response = await request(app).get("/api/health");

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				status: "healthy",
				checks: { dokku: "ok", database: "ok" },
			});
		});

		it("should return 503 with unhealthy status when dokku is unreachable", async () => {
			vi.mocked(pingDb).mockReturnValue(undefined);
			vi.mocked(executeCommand).mockResolvedValue({
				command: "dokku version",
				exitCode: 1,
				stdout: "",
				stderr: "SSH connection failed",
			});

			const response = await request(app).get("/api/health");

			expect(response.status).toBe(503);
			expect(response.body).toEqual({
				status: "unhealthy",
				checks: { dokku: "error", database: "ok" },
			});
		});

		it("should return 503 with unhealthy status when database fails", async () => {
			vi.mocked(pingDb).mockImplementation(() => {
				throw new Error("DB error");
			});
			vi.mocked(executeCommand).mockResolvedValue({
				command: "dokku version",
				exitCode: 0,
				stdout: "dokku version 0.34.0",
				stderr: "",
			});

			const response = await request(app).get("/api/health");

			expect(response.status).toBe(503);
			expect(response.body).toEqual({
				status: "unhealthy",
				checks: { dokku: "ok", database: "error" },
			});
		});

		it("should return 503 when both checks fail", async () => {
			vi.mocked(pingDb).mockImplementation(() => {
				throw new Error("DB error");
			});
			vi.mocked(executeCommand).mockResolvedValue({
				command: "dokku version",
				exitCode: 1,
				stdout: "",
				stderr: "SSH connection failed",
			});

			const response = await request(app).get("/api/health");

			expect(response.status).toBe(503);
			expect(response.body).toEqual({
				status: "unhealthy",
				checks: { dokku: "error", database: "error" },
			});
		});
	});
});
