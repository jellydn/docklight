import fs from "node:fs";
import path from "node:path";
import express from "express";
import { authenticator } from "otplib";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_DB_PATH = path.join(__dirname, "test-data", "two-factor-test.db");

describe("two-factor persistence", () => {
	beforeEach(() => {
		fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
		for (const suffix of ["", "-shm", "-wal"]) {
			if (fs.existsSync(`${TEST_DB_PATH}${suffix}`)) fs.unlinkSync(`${TEST_DB_PATH}${suffix}`);
		}
		vi.stubEnv("DOCKLIGHT_DB_PATH", TEST_DB_PATH);
		vi.stubEnv("DOCKLIGHT_AUTH_MAX_REQUESTS", "100");
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("rejects a reused TOTP at login with real persistent state", async () => {
		const { createUser, enableTwoFactor } = await import("./db.js");
		const { hashPassword } = await import("./auth.js");
		const { encryptTwoFactorSecret } = await import("./two-factor.js");
		const { registerAuthRoutes } = await import("../routes/auth.js");
		const user = createUser("alice", await hashPassword("correct-password"), "admin");
		const secret = authenticator.generateSecret();
		enableTwoFactor(user.id, encryptTwoFactorSecret(secret), []);
		const app = express();
		app.use(express.json());
		registerAuthRoutes(app);
		const credentials = {
			username: "alice",
			password: "correct-password",
			twoFactorCode: authenticator.generate(secret),
		};
		const accepted = await request(app).post("/api/auth/login").send(credentials);
		expect(accepted.body).toEqual({ success: true });
		expect(accepted.headers["set-cookie"]).toBeDefined();
		const replayed = await request(app).post("/api/auth/login").send(credentials);
		expect(replayed.status).toBe(401);
		expect(replayed.headers["set-cookie"]).toBeUndefined();
	});

	it("enables, consumes, and disables a user's two-factor state", async () => {
		const {
			consumeTwoFactorBackupCode,
			createUser,
			disableTwoFactor,
			enableTwoFactor,
			getUserTwoFactorState,
			savePendingTwoFactorSecret,
		} = await import("./db.js");
		const user = createUser("alice", "hash", "admin");

		expect(getUserTwoFactorState(user.id)).toEqual({
			enabled: false,
			secret: null,
			pendingSecret: null,
			backupCodeHashes: [],
		});

		savePendingTwoFactorSecret(user.id, "pending-secret");
		expect(getUserTwoFactorState(user.id)?.pendingSecret).toBe("pending-secret");

		enableTwoFactor(user.id, "encrypted-secret", ["first", "second"]);
		expect(getUserTwoFactorState(user.id)).toEqual({
			enabled: true,
			secret: "encrypted-secret",
			pendingSecret: null,
			backupCodeHashes: ["first", "second"],
		});

		expect(consumeTwoFactorBackupCode(user.id, "first")).toBe(true);
		expect(consumeTwoFactorBackupCode(user.id, "first")).toBe(false);
		expect(getUserTwoFactorState(user.id)?.backupCodeHashes).toEqual(["second"]);

		disableTwoFactor(user.id);
		expect(getUserTwoFactorState(user.id)).toEqual({
			enabled: false,
			secret: null,
			pendingSecret: null,
			backupCodeHashes: [],
		});
	});
});
