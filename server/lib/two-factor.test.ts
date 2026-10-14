import { authenticator } from "otplib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createTwoFactorSetup,
	decryptTwoFactorSecret,
	encryptTwoFactorSecret,
	generateRecoveryCodes,
	hashRecoveryCode,
	verifyTotp,
} from "./two-factor.js";

describe("two-factor helpers", () => {
	beforeEach(() => {
		vi.stubEnv("DOCKLIGHT_2FA_ENCRYPTION_KEY", "test-encryption-key");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("encrypts and decrypts a secret without storing plaintext", () => {
		const secret = "JBSWY3DPEHPK3PXP";
		const encrypted = encryptTwoFactorSecret(secret);

		expect(encrypted).not.toContain(secret);
		expect(decryptTwoFactorSecret(encrypted)).toBe(secret);
	});

	it("uses the JWT key when the optional override is empty", () => {
		vi.stubEnv("DOCKLIGHT_2FA_ENCRYPTION_KEY", "");
		vi.stubEnv("JWT_SECRET", "jwt-key");
		const encrypted = encryptTwoFactorSecret("JBSWY3DPEHPK3PXP");
		vi.stubEnv("DOCKLIGHT_2FA_ENCRYPTION_KEY", "jwt-key");
		expect(decryptTwoFactorSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
	});

	it("rejects a secret encrypted with another key", () => {
		const encrypted = encryptTwoFactorSecret("JBSWY3DPEHPK3PXP");
		vi.stubEnv("DOCKLIGHT_2FA_ENCRYPTION_KEY", "different-key");

		expect(() => decryptTwoFactorSecret(encrypted)).toThrow();
	});

	it("creates a compatible authenticator URI and accepts its current code", () => {
		const setup = createTwoFactorSetup("alice@example.com");

		expect(setup.otpauthUrl).toContain("otpauth://totp/Docklight:alice%40example.com");
		expect(verifyTotp(authenticator.generate(setup.secret), setup.secret)).toBe(true);
		expect(verifyTotp("00000", setup.secret)).toBe(false);
	});

	it("creates ten distinct normalized recovery codes", () => {
		const codes = generateRecoveryCodes();

		expect(codes).toHaveLength(10);
		expect(new Set(codes)).toHaveLength(10);
		expect(codes.every((code) => /^[A-F0-9]{16}-[A-F0-9]{16}$/.test(code))).toBe(true);
		expect(hashRecoveryCode(codes[0].toLowerCase())).toBe(hashRecoveryCode(codes[0]));
	});
});
