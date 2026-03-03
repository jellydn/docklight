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
			(pingDb as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			(executeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
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
			(pingDb as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			(executeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
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
			(pingDb as ReturnType<typeof vi.fn>).mockImplementation(() => {
				throw new Error("DB error");
			});
			(executeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
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
			(pingDb as ReturnType<typeof vi.fn>).mockImplementation(() => {
				throw new Error("DB error");
			});
			(executeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
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

		it("should return 503 with unhealthy status when executeCommand throws", async () => {
			(pingDb as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
			(executeCommand as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected error"));

			const response = await request(app).get("/api/health");

			expect(response.status).toBe(503);
			expect(response.body).toEqual({
				status: "unhealthy",
				checks: { dokku: "error", database: "ok" },
			});
		});
	});
});
