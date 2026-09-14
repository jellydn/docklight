import express from "express";
import cookieParser from "cookie-parser";
import { authenticator } from "otplib";
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
	getUserTwoFactorState: vi.fn(),
	consumeTwoFactorBackupCode: vi.fn(),
	savePendingTwoFactorSecret: vi.fn(),
	enableTwoFactor: vi.fn(),
	disableTwoFactor: vi.fn(),
	createPasswordResetToken: vi.fn(),
	deleteExpiredPasswordResetTokens: vi.fn(),
	resetPasswordWithToken: vi.fn(),
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

import { generateToken, hashPassword, hashResetToken } from "../lib/auth.js";
import {
	consumeTwoFactorBackupCode,
	createPasswordResetToken,
	getUserByEmail,
	getUserByUsername,
	getUserTwoFactorState,
	resetPasswordWithToken,
} from "../lib/db.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { encryptTwoFactorSecret } from "../lib/two-factor.js";
import { registerAuthRoutes } from "./auth.js";

function createTestApp(): express.Express {
	const app = express();
	app.use(cookieParser());
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
		vi.stubEnv("DOCKLIGHT_2FA_ENCRYPTION_KEY", "test-encryption-key");
		vi.mocked(getUserTwoFactorState).mockReturnValue(null);
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
		vi.mocked(resetPasswordWithToken).mockReturnValue(7);

		const response = await request(createTestApp())
			.post("/api/auth/reset-password")
			.send({ token: "reset-token", password: "new-password" });

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ success: true });
		expect(resetPasswordWithToken).toHaveBeenCalledWith(
			hashResetToken("reset-token"),
			expect.any(String)
		);
	});

	it("should require and verify a TOTP code before setting the session cookie", async () => {
		const passwordHash = await hashPassword("correct-password");
		const secret = authenticator.generateSecret();
		vi.mocked(getUserByUsername).mockReturnValue({
			id: 1,
			username: "alice",
			email: null,
			password_hash: passwordHash,
			role: "admin",
			createdAt: new Date().toISOString(),
		});
		vi.mocked(getUserTwoFactorState).mockReturnValue({
			enabled: true,
			secret: encryptTwoFactorSecret(secret),
			pendingSecret: null,
			backupCodeHashes: [],
		});

		const challenge = await request(createTestApp())
			.post("/api/auth/login")
			.send({ username: "alice", password: "correct-password" });
		expect(challenge.body).toEqual({ success: false, requiresTwoFactor: true });
		expect(challenge.headers["set-cookie"]).toBeUndefined();

		const verified = await request(createTestApp())
			.post("/api/auth/login")
			.send({
				username: "alice",
				password: "correct-password",
				twoFactorCode: authenticator.generate(secret),
			});
		expect(verified.body).toEqual({ success: true });
		expect(verified.headers["set-cookie"]?.[0]).toContain("session=");
	});

	it("should consume a recovery code once when TOTP verification fails", async () => {
		vi.mocked(getUserByUsername).mockReturnValue({
			id: 2,
			username: "bob",
			email: null,
			password_hash: await hashPassword("correct-password"),
			role: "operator",
			createdAt: new Date().toISOString(),
		});
		vi.mocked(getUserTwoFactorState).mockReturnValue({
			enabled: true,
			secret: encryptTwoFactorSecret(authenticator.generateSecret()),
			pendingSecret: null,
			backupCodeHashes: ["hash"],
		});
		vi.mocked(consumeTwoFactorBackupCode).mockReturnValue(true);

		const response = await request(createTestApp()).post("/api/auth/login").send({
			username: "bob",
			password: "correct-password",
			twoFactorCode: "ABCDE-FGHIJ",
		});

		expect(response.body).toEqual({ success: true });
		expect(consumeTwoFactorBackupCode).toHaveBeenCalledWith(2, expect.any(String));
	});

	it("should return two-factor authentication status to an authenticated user", async () => {
		vi.mocked(getUserTwoFactorState).mockReturnValue({
			enabled: true,
			secret: "encrypted",
			pendingSecret: null,
			backupCodeHashes: [],
		});
		const token = generateToken({ id: 3, username: "carol", role: "viewer" });

		const response = await request(createTestApp())
			.get("/api/auth/2fa")
			.set("Cookie", `session=${token}`);

		expect(response.body).toEqual({ enabled: true });
	});
});
