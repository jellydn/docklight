import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";

vi.mock("../lib/server-config.js", () => ({
	getSettings: vi.fn(),
	updateSettings: vi.fn(),
	validateSettings: vi.fn(() => []),
}));

vi.mock("../lib/auth.js", () => ({
	authMiddleware: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
	requireAdmin: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock("../lib/rate-limiter.js", () => ({
	adminRateLimiter: vi.fn((_req: Request, _res: Response, next: NextFunction) => next()),
}));

vi.mock("../lib/db.js", () => ({
	insertAuditLog: vi.fn(),
}));
import { getSettings, updateSettings, validateSettings } from "../lib/server-config.js";
import { registerSettingsRoutes } from "./settings.js";

const mockSettings = {
	dokkuSshTarget: "dokku@192.168.1.1",
	dokkuSshKeyPath: "/app/.ssh/id_ed25519",
	logLevel: "info",
};

function createTestApp() {
	const app = express();
	app.use(express.json());
	registerSettingsRoutes(app);
	return app;
}

describe("Settings routes", () => {
	let app: ReturnType<typeof createTestApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		app = createTestApp();
	});

	describe("GET /api/settings", () => {
		it("should return current settings", async () => {
			vi.mocked(getSettings).mockReturnValue(mockSettings);

			const response = await request(app).get("/api/settings");

			expect(response.status).toBe(200);
			expect(response.body).toEqual(mockSettings);
			expect(getSettings).toHaveBeenCalledOnce();
		});
	});

	describe("PUT /api/settings", () => {
		it("should update settings and return new values", async () => {
			const updated = { ...mockSettings, logLevel: "debug" };
			vi.mocked(validateSettings).mockReturnValue([]);
			vi.mocked(updateSettings).mockImplementation(() => {});
			vi.mocked(getSettings).mockReturnValue(updated);

			const response = await request(app).put("/api/settings").send({ logLevel: "debug" });

			expect(response.status).toBe(200);
			expect(response.body).toEqual(updated);
			expect(updateSettings).toHaveBeenCalledWith({ logLevel: "debug" });
		});

		it("should return 400 for invalid body", async () => {
			const response = await request(app).put("/api/settings").send([]);

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
			expect(updateSettings).not.toHaveBeenCalled();
		});

		it("should return 400 for non-string field value", async () => {
			const response = await request(app).put("/api/settings").send({ logLevel: 42 });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
			expect(updateSettings).not.toHaveBeenCalled();
		});

		it("should return 400 when validation fails", async () => {
			vi.mocked(validateSettings).mockReturnValue([
				{ field: "logLevel", message: "Must be one of: fatal, error, warn, info, debug, trace" },
			]);

			const response = await request(app).put("/api/settings").send({ logLevel: "invalid" });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error");
			expect(updateSettings).not.toHaveBeenCalled();
		});

		it("should return 400 for empty updates", async () => {
			const response = await request(app).put("/api/settings").send({ unknownField: "value" });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty("error", "No valid settings fields provided");
			expect(updateSettings).not.toHaveBeenCalled();
		});

		it("should ignore unknown fields", async () => {
			vi.mocked(validateSettings).mockReturnValue([]);
			vi.mocked(updateSettings).mockImplementation(() => {});
			vi.mocked(getSettings).mockReturnValue(mockSettings);

			const response = await request(app)
				.put("/api/settings")
				.send({ logLevel: "info", unknownField: "value" });

			expect(response.status).toBe(200);
			expect(updateSettings).toHaveBeenCalledWith({ logLevel: "info" });
		});
	});
});
