import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_DB_PATH = path.join(__dirname, "test-data", "two-factor-test.db");

describe("two-factor persistence", () => {
	beforeEach(() => {
		fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
		for (const suffix of ["", "-shm", "-wal"]) {
			if (fs.existsSync(`${TEST_DB_PATH}${suffix}`)) fs.unlinkSync(`${TEST_DB_PATH}${suffix}`);
		}
		vi.stubEnv("DOCKLIGHT_DB_PATH", TEST_DB_PATH);
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
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
