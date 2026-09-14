import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { authenticator } from "otplib";

const TWO_FACTOR_ISSUER = "Docklight";
const RECOVERY_CODE_COUNT = 10;
const totp = authenticator.clone({ window: 1 });

function getEncryptionKey(): Buffer {
	const secret =
		process.env.DOCKLIGHT_2FA_ENCRYPTION_KEY ??
		process.env.JWT_SECRET ??
		"docklight-dev-secret-change-in-production";
	return createHash("sha256").update(secret).digest();
}

export function encryptTwoFactorSecret(secret: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
	const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
	return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64url")).join(".");
}

export function decryptTwoFactorSecret(encryptedSecret: string): string {
	const [ivValue, authTagValue, encryptedValue] = encryptedSecret.split(".");
	if (!ivValue || !authTagValue || !encryptedValue) {
		throw new Error("Invalid encrypted two-factor secret");
	}

	const decipher = createDecipheriv(
		"aes-256-gcm",
		getEncryptionKey(),
		Buffer.from(ivValue, "base64url")
	);
	decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
	return Buffer.concat([
		decipher.update(Buffer.from(encryptedValue, "base64url")),
		decipher.final(),
	]).toString("utf8");
}

export function createTwoFactorSetup(username: string): {
	secret: string;
	otpauthUrl: string;
} {
	const secret = totp.generateSecret();
	return {
		secret,
		otpauthUrl: totp.keyuri(username, TWO_FACTOR_ISSUER, secret),
	};
}

export function verifyTotp(code: string, secret: string): boolean {
	return /^\d{6}$/.test(code) && totp.check(code, secret);
}

export function generateRecoveryCodes(): string[] {
	return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
		const value = randomBytes(5).toString("hex").toUpperCase();
		return `${value.slice(0, 5)}-${value.slice(5)}`;
	});
}

export function hashRecoveryCode(code: string): string {
	return createHash("sha256").update(code.trim().replaceAll("-", "").toUpperCase()).digest("hex");
}
