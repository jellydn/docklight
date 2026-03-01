import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

vi.mock("../lib/server-config.js", () => ({
	getServerConfig: vi.fn(),
	updateServerConfig: vi.fn(),
	validateServerConfig: vi.fn(),
}));

vi.mock("../lib/auth.js", () => ({
	authMiddleware: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	requireAdmin: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock("../lib/rate-limiter.js", () => ({
	adminRateLimiter: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock("../lib/logger.js", () => ({
	logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
	getServerConfig,
	updateServerConfig,
	validateServerConfig,
} from "../lib/server-config.js";
import { registerServerConfigRoutes } from "./server-config.js";

function createTestApp() {
	const app = express();
	app.use(express.json());
	registerServerConfigRoutes(app);
	return app;
}

const mockConfig = {
	dokkuSshTarget: "dokku@example.com",
	dokkuSshRootTarget: "root@example.com",
	dokkuSshKeyPath: "/home/user/.ssh/id_rsa",
	dokkuSshOpts: "",
	logLevel: "info",
};

describe("Server config routes", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		vi.resetAllMocks();
		app = createTestApp();
	});

	describe("GET /api/server/config", () => {
		it("should return the current server config", async () => {
			vi.mocked(getServerConfig).mockReturnValue(mockConfig);

			const response = await request(app).get("/api/server/config");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockConfig);
			expect(getServerConfig).toHaveBeenCalledOnce();
		});
	});

	describe("PUT /api/server/config", () => {
		it("should update config and return updated values", async () => {
			vi.mocked(validateServerConfig).mockReturnValue(null);
			vi.mocked(getServerConfig).mockReturnValue({
				...mockConfig,
				logLevel: "debug",
			});

			const response = await request(app)
				.put("/api/server/config")
				.send({ logLevel: "debug" });

			expect(response.status).toBe(200);
			expect(updateServerConfig).toHaveBeenCalledWith({ logLevel: "debug" });
			expect(response.body.logLevel).toBe("debug");
		});

		it("should return 400 for invalid body (array)", async () => {
			const response = await request(app).put("/api/server/config").send([]);

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
			expect(updateServerConfig).not.toHaveBeenCalled();
		});

		it("should return 400 when validation fails", async () => {
			vi.mocked(validateServerConfig).mockReturnValue("Invalid log level");

			const response = await request(app)
				.put("/api/server/config")
				.send({ logLevel: "invalid" });

			expect(response.status).toBe(400);
			expect(response.body).toEqual({ error: "Invalid log level" });
			expect(updateServerConfig).not.toHaveBeenCalled();
		});

		it("should return 500 when updateServerConfig throws", async () => {
			vi.mocked(validateServerConfig).mockReturnValue(null);
			vi.mocked(updateServerConfig).mockImplementation(() => {
				throw new Error("Disk error");
			});

			const response = await request(app)
				.put("/api/server/config")
				.send({ logLevel: "debug" });

			expect(response.status).toBe(500);
			expect(response.body).toHaveProperty("error");
		});

		it("should ignore unknown keys in the request body", async () => {
			vi.mocked(validateServerConfig).mockReturnValue(null);
			vi.mocked(getServerConfig).mockReturnValue(mockConfig);

			const response = await request(app)
				.put("/api/server/config")
				.send({ logLevel: "info", unknownField: "value", jwtSecret: "should-be-ignored" });

			expect(response.status).toBe(200);
			expect(updateServerConfig).toHaveBeenCalledWith({ logLevel: "info" });
		});

		it("should ignore non-string values", async () => {
			vi.mocked(validateServerConfig).mockReturnValue(null);
			vi.mocked(getServerConfig).mockReturnValue(mockConfig);

			const response = await request(app)
				.put("/api/server/config")
				.send({ logLevel: 42 });

			expect(response.status).toBe(200);
			// logLevel with numeric value should be ignored
			expect(updateServerConfig).toHaveBeenCalledWith({});
		});
	});
});
