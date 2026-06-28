import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/rate-limiter.js", () => ({
	authRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
	authCheckRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock("../lib/logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("../lib/db.js", () => ({
	getUserByUsername: vi.fn(),
	getUserByEmail: vi.fn(),
	getUserAuthStateById: vi.fn(),
	createPasswordResetToken: vi.fn(),
	getPasswordResetTokenByHash: vi.fn(),
	markPasswordResetTokenUsed: vi.fn(),
	updateUser: vi.fn(),
}));

vi.mock("../lib/email.js", () => ({
	buildPasswordResetUrl: vi.fn(
		(token: string) => `https://docklight.example.com/reset-password?token=${token}`
	),
	sendPasswordResetEmail: vi.fn(),
}));

vi.mock("./util.js", () => ({
	safeAuditLogWithUserId: vi.fn(),
}));

import { hashResetToken } from "../lib/auth.js";
import {
	createPasswordResetToken,
	getPasswordResetTokenByHash,
	getUserByEmail,
	markPasswordResetTokenUsed,
	updateUser,
} from "../lib/db.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { registerAuthRoutes } from "./auth.js";

function createTestApp(): express.Express {
	const app = express();
	app.use(express.json());
	registerAuthRoutes(app);
	return app;
}

describe("auth routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("NODE_ENV", "test");
		vi.stubEnv("RESEND_API_KEY", "");
		vi.stubEnv("RESEND_FROM_EMAIL", "");
		vi.stubEnv("DOCKLIGHT_APP_URL", "https://docklight.example.com");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("should return reset url in non-production when resend is not configured", async () => {
		vi.mocked(getUserByEmail).mockReturnValue({
			id: 1,
			username: "alice",
			email: "alice@example.com",
			password_hash: "hash",
			role: "admin",
			sessionVersion: 0,
			createdAt: new Date().toISOString(),
		});
		vi.mocked(createPasswordResetToken).mockReturnValue({
			id: 1,
			userId: 1,
			tokenHash: "token-hash",
			expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
			usedAt: null,
			createdAt: new Date().toISOString(),
		});

		const response = await request(createTestApp())
			.post("/api/auth/forgot-password")
			.send({ email: "alice@example.com" });

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty("success", true);
		expect(response.body).toHaveProperty("resetToken");
		expect(response.body).toHaveProperty(
			"resetUrl",
			`https://docklight.example.com/reset-password?token=${response.body.resetToken}`
		);
		expect(sendPasswordResetEmail).not.toHaveBeenCalled();
		expect(createPasswordResetToken).toHaveBeenCalledOnce();
	});

	it("should send reset email through resend when configured", async () => {
		vi.stubEnv("RESEND_API_KEY", "re_123");
		vi.stubEnv("RESEND_FROM_EMAIL", "Docklight <no-reply@docklight.example.com>");
		vi.mocked(getUserByEmail).mockReturnValue({
			id: 1,
			username: "alice",
			email: "alice@example.com",
			password_hash: "hash",
			role: "admin",
			sessionVersion: 0,
			createdAt: new Date().toISOString(),
		});
		vi.mocked(createPasswordResetToken).mockReturnValue({
			id: 1,
			userId: 1,
			tokenHash: "token-hash",
			expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
			usedAt: null,
			createdAt: new Date().toISOString(),
		});

		const response = await request(createTestApp())
			.post("/api/auth/forgot-password")
			.send({ email: "alice@example.com" });

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ success: true });
		expect(sendPasswordResetEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "alice@example.com",
				username: "alice",
				resetUrl: expect.stringContaining("https://docklight.example.com/reset-password?token="),
			})
		);
	});

	it("should reset password and invalidate the reset token", async () => {
		vi.mocked(getPasswordResetTokenByHash).mockReturnValue({
			id: 1,
			userId: 7,
			tokenHash: "token-hash",
			expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
			usedAt: null,
			createdAt: new Date().toISOString(),
		});

		const response = await request(createTestApp())
			.post("/api/auth/reset-password")
			.send({ token: "reset-token", password: "new-password" });

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ success: true });
		expect(updateUser).toHaveBeenCalledWith(
			7,
			expect.objectContaining({ passwordHash: expect.any(String) })
		);
		expect(markPasswordResetTokenUsed).toHaveBeenCalledWith(hashResetToken("reset-token"));
	});
});
