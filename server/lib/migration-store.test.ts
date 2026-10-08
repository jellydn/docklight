import fs from "fs";
import os from "os";
import path from "path";
import { randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	migrationDirectory,
	openMigrationData,
	readMigrationFile,
	sealMigrationData,
	writeMigrationFile,
} from "./migration-store.js";

describe("encrypted migration storage", () => {
	let directory: string;
	beforeEach(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "migration-store-"));
		vi.stubEnv("DOCKLIGHT_DB_PATH", path.join(directory, "test.db"));
		vi.stubEnv("DOCKLIGHT_MIGRATION_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
	});
	afterEach(() => {
		vi.unstubAllEnvs();
		fs.rmSync(directory, { recursive: true, force: true });
	});
	it("round trips without storing plaintext and uses private permissions", () => {
		const value = { target: "operator@destination.invalid", fingerprint: "private-pin" };
		writeMigrationFile("destination.json", value);
		expect(readMigrationFile("destination.json")).toEqual(value);
		const filename = path.join(migrationDirectory(), "destination.json");
		expect(fs.readFileSync(filename, "utf8")).not.toContain(value.target);
		expect(fs.statSync(filename).mode & 0o777).toBe(0o600);
		expect(fs.statSync(migrationDirectory()).mode & 0o777).toBe(0o700);
	});
	it("uses a fresh nonce and rejects modified ciphertext and the wrong key", () => {
		const encrypted = sealMigrationData({ value: "private-config" });
		expect(sealMigrationData({ value: "private-config" })).not.toEqual(encrypted);
		const envelope = JSON.parse(encrypted.toString());
		envelope.tag = "00".repeat(16);
		expect(() => openMigrationData(Buffer.from(JSON.stringify(envelope)))).toThrow(
			"Migration storage is unavailable"
		);
		vi.stubEnv("DOCKLIGHT_MIGRATION_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
		expect(() => openMigrationData(encrypted)).toThrow("Migration storage is unavailable");
	});
	it("fails closed without a key and does not create storage", () => {
		vi.stubEnv("DOCKLIGHT_MIGRATION_ENCRYPTION_KEY", "");
		expect(() => writeMigrationFile("destination.json", { target: "destination.invalid" })).toThrow(
			"not configured"
		);
		expect(fs.existsSync(migrationDirectory())).toBe(false);
		expect(readMigrationFile("destination.json")).toBeNull();
	});
});
