import express, { type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/apps.js", () => ({
	getApps: vi.fn(),
	getAppDetail: vi.fn(),
	createApp: vi.fn(),
	destroyApp: vi.fn(),
	restartApp: vi.fn(),
	rebuildApp: vi.fn(),
	stopApp: vi.fn(),
	startApp: vi.fn(),
	scaleApp: vi.fn(),
	unlockApp: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
	authMiddleware: vi.fn((_req: Request, _res: Response, next: () => void) => next()),
	requireOperator: vi.fn((_req: Request, _res: Response, next: () => void) => next()),
}));

vi.mock("../lib/cache.js", () => ({
	get: vi.fn().mockReturnValue(null),
	set: vi.fn(),
	clearPrefix: vi.fn(),
}));

vi.mock("../lib/logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("../lib/app-events.js", () => ({
	broadcastAppEvent: vi.fn(),
}));

import { createApp, destroyApp, restartApp, stopApp, startApp, rebuildApp, scaleApp, unlockApp } from "../lib/apps.js";
import { broadcastAppEvent } from "../lib/app-events.js";
import { registerAppRoutes } from "./apps.js";

function createTestApp() {
	const app = express();
	app.use(express.json());
	registerAppRoutes(app);
	return app;
}

describe("App routes - broadcastAppEvent", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		app = createTestApp();
	});

	describe("POST /api/apps", () => {
		it("should broadcast app:create event after successful app creation", async () => {
			vi.mocked(createApp).mockResolvedValue({
				command: "dokku apps:create test-app",
				exitCode: 0,
				stdout: "Creating test-app",
				stderr: "",
			});

			const response = await request(app).post("/api/apps").send({ name: "test-app" });

			expect(response.status).toBe(201);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:create",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});

		it("should not broadcast event when app creation fails", async () => {
			vi.mocked(createApp).mockResolvedValue({
				command: "dokku apps:create test-app",
				exitCode: 1,
				stdout: "",
				stderr: "App already exists",
			});

			const response = await request(app).post("/api/apps").send({ name: "test-app" });

			expect(response.status).toBe(500);
			expect(broadcastAppEvent).not.toHaveBeenCalled();
		});
	});

	describe("POST /api/apps/:name/restart", () => {
		it("should broadcast app:restart event after successful restart", async () => {
			vi.mocked(restartApp).mockResolvedValue({
				command: "dokku ps:restart test-app",
				exitCode: 0,
				stdout: "Restarting test-app",
				stderr: "",
			});

			const response = await request(app).post("/api/apps/test-app/restart");

			expect(response.status).toBe(200);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:restart",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});

		it("should not broadcast event when restart fails", async () => {
			vi.mocked(restartApp).mockResolvedValue({
				command: "dokku ps:restart test-app",
				exitCode: 1,
				stdout: "",
				stderr: "App not running",
			});

			const response = await request(app).post("/api/apps/test-app/restart");

			expect(response.status).toBe(500);
			expect(broadcastAppEvent).not.toHaveBeenCalled();
		});
	});

	describe("POST /api/apps/:name/stop", () => {
		it("should broadcast app:stop event after successful stop", async () => {
			vi.mocked(stopApp).mockResolvedValue({
				command: "dokku ps:stop test-app",
				exitCode: 0,
				stdout: "Stopping test-app",
				stderr: "",
			});

			const response = await request(app).post("/api/apps/test-app/stop");

			expect(response.status).toBe(200);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:stop",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});
	});

	describe("POST /api/apps/:name/start", () => {
		it("should broadcast app:start event after successful start", async () => {
			vi.mocked(startApp).mockResolvedValue({
				command: "dokku ps:start test-app",
				exitCode: 0,
				stdout: "Starting test-app",
				stderr: "",
			});

			const response = await request(app).post("/api/apps/test-app/start");

			expect(response.status).toBe(200);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:start",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});
	});

	describe("POST /api/apps/:name/rebuild", () => {
		it("should broadcast app:rebuild event after successful rebuild", async () => {
			vi.mocked(rebuildApp).mockResolvedValue({
				command: "dokku ps:rebuild test-app",
				exitCode: 0,
				stdout: "Rebuilding test-app",
				stderr: "",
			});

			const response = await request(app).post("/api/apps/test-app/rebuild");

			expect(response.status).toBe(200);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:rebuild",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});
	});

	describe("POST /api/apps/:name/unlock", () => {
		it("should broadcast app:unlock event after successful unlock", async () => {
			vi.mocked(unlockApp).mockResolvedValue({
				command: "dokku apps:unlock test-app",
				exitCode: 0,
				stdout: "Unlocking test-app",
				stderr: "",
			});

			const response = await request(app).post("/api/apps/test-app/unlock");

			expect(response.status).toBe(200);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:unlock",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});
	});

	describe("POST /api/apps/:name/scale", () => {
		it("should broadcast app:scale event after successful scale", async () => {
			vi.mocked(scaleApp).mockResolvedValue({
				command: "dokku ps:scale test-app web=2",
				exitCode: 0,
				stdout: "Scaling test-app",
				stderr: "",
			});

			const response = await request(app)
				.post("/api/apps/test-app/scale")
				.send({ processType: "web", count: 2 });

			expect(response.status).toBe(200);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:scale",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});
	});

	describe("DELETE /api/apps/:name", () => {
		it("should broadcast app:destroy event after successful destroy", async () => {
			vi.mocked(destroyApp).mockResolvedValue({
				command: "dokku apps:destroy test-app",
				exitCode: 0,
				stdout: "Destroying test-app",
				stderr: "",
			});

			const response = await request(app)
				.delete("/api/apps/test-app")
				.send({ confirmName: "test-app" });

			expect(response.status).toBe(200);
			expect(broadcastAppEvent).toHaveBeenCalledWith({
				type: "app:destroy",
				appName: "test-app",
				timestamp: expect.any(String),
			});
		});

		it("should not broadcast event when destroy fails", async () => {
			vi.mocked(destroyApp).mockResolvedValue({
				command: "dokku apps:destroy test-app",
				exitCode: 1,
				stdout: "",
				stderr: "App not found",
			});

			const response = await request(app)
				.delete("/api/apps/test-app")
				.send({ confirmName: "test-app" });

			expect(response.status).toBe(500);
			expect(broadcastAppEvent).not.toHaveBeenCalled();
		});
	});
});
