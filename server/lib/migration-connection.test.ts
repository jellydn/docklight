import fs from "fs";
import os from "os";
import path from "path";
import { createHash, randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "node-ssh";
import {
	destinationEndpoint,
	destinationSummary,
	saveMigrationDestination,
	sourceEndpoint,
	testMigrationConnection,
	withMigrationConnection,
} from "./migration-connection.js";

const ssh = vi.hoisted(() => ({
	connect: vi.fn(),
	execCommand: vi.fn(),
	dispose: vi.fn(),
	requestSFTP: vi.fn(),
}));
vi.mock("node-ssh", () => ({
	NodeSSH: class {
		connect = ssh.connect;
		execCommand = ssh.execCommand;
		dispose = ssh.dispose;
		requestSFTP = ssh.requestSFTP;
	},
}));

const sourceKey = Buffer.from("synthetic source public host key");
const destinationKey = Buffer.from("synthetic destination public host key");
const fingerprint = (key: Buffer): string =>
	`SHA256:${createHash("sha256").update(key).digest("base64").replace(/=+$/, "")}`;

describe("pinned migration connections", () => {
	let directory: string;
	beforeEach(() => {
		vi.resetAllMocks();
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "migration-connection-"));
		vi.stubEnv("DOCKLIGHT_DB_PATH", path.join(directory, "test.db"));
		vi.stubEnv("DOCKLIGHT_MIGRATION_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
		vi.stubEnv("DOCKLIGHT_MIGRATION_SOURCE_TARGET", "operator@source.invalid");
		vi.stubEnv("DOCKLIGHT_MIGRATION_SOURCE_KEY_PATH", "/private/source-key");
		vi.stubEnv("DOCKLIGHT_MIGRATION_SOURCE_FINGERPRINT", fingerprint(sourceKey));
		vi.stubEnv("DOCKLIGHT_MIGRATION_DESTINATION_KEY_PATH", "/private/destination-key");
		vi.stubEnv("DOCKLIGHT_MIGRATION_ALLOWED_TARGETS", "operator@destination.invalid");
		ssh.connect.mockResolvedValue(undefined);
		ssh.execCommand.mockResolvedValue({ code: 0, stdout: "0.35.0", stderr: "" });
		ssh.requestSFTP.mockResolvedValue({});
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
		fs.rmSync(directory, { recursive: true, force: true });
	});
	it("stores only encrypted settings and returns a redacted summary", () => {
		const result = saveMigrationDestination(
			"operator@destination.invalid",
			fingerprint(destinationKey)
		);
		expect(result).toEqual({
			configured: true,
			sourceConfigured: true,
			revision: expect.any(String),
		});
		expect(destinationSummary()).toEqual(result);
		expect(JSON.stringify(result)).not.toContain("destination.invalid");
		expect(destinationEndpoint().host).toBe("destination.invalid");
		expect(
			saveMigrationDestination("operator@destination.invalid", fingerprint(destinationKey)).revision
		).not.toBe(result.revision);
	});
	it("rejects unapproved targets, embedded passwords, and source host aliases", () => {
		expect(() =>
			saveMigrationDestination("operator@other.invalid", fingerprint(destinationKey))
		).toThrow("approved");
		expect(() =>
			saveMigrationDestination(
				"ssh://operator:password@destination.invalid",
				fingerprint(destinationKey)
			)
		).toThrow("approved");
		expect(() =>
			saveMigrationDestination("operator@destination.invalid", fingerprint(sourceKey))
		).toThrow("different hosts");
		expect(ssh.connect).not.toHaveBeenCalled();
	});
	it("rechecks the allowlist at execution time", () => {
		saveMigrationDestination("operator@destination.invalid", fingerprint(destinationKey));
		vi.stubEnv("DOCKLIGHT_MIGRATION_ALLOWED_TARGETS", "");
		expect(() => destinationEndpoint()).toThrow("approved");
	});
	it("pins the public key before issuing only read-only commands", async () => {
		saveMigrationDestination("operator@destination.invalid", fingerprint(destinationKey));
		ssh.connect.mockImplementation(async (config: Config) => {
			const key = config.host === "source.invalid" ? sourceKey : destinationKey;
			expect(typeof config.hostVerifier).toBe("function");
			const verifier = config.hostVerifier as (key: Buffer) => boolean;
			expect(verifier(key)).toBe(true);
			expect(verifier(Buffer.from("wrong public key"))).toBe(false);
		});
		await expect(testMigrationConnection(new AbortController().signal)).resolves.toEqual({
			success: true,
			sourceReadable: true,
			destinationSftp: true,
		});
		expect(ssh.execCommand.mock.calls.map(([command]) => command)).toEqual([
			"'dokku' 'version'",
			"'dokku' '--quiet' 'apps:list'",
			"'dokku' 'version'",
		]);
	});
	it("does not run commands after a host-key failure or expose raw errors", async () => {
		ssh.connect.mockRejectedValue(new Error("private-config source.invalid"));
		await expect(
			withMigrationConnection(sourceEndpoint(), new AbortController().signal, (connection) =>
				connection.command(["dokku", "version"])
			)
		).rejects.toThrow("Pinned SSH operation failed");
		expect(ssh.execCommand).not.toHaveBeenCalled();
	});
	it("cancels a stalled handshake without waiting for its completion", async () => {
		ssh.connect.mockImplementation(() => new Promise(() => {}));
		const controller = new AbortController();
		const work = vi.fn();
		const operation = withMigrationConnection(sourceEndpoint(), controller.signal, work);
		controller.abort();
		await expect(operation).rejects.toThrow("cancelled");
		expect(work).not.toHaveBeenCalled();
	});
	it("bounds the entire operation including stalled SFTP", async () => {
		vi.useFakeTimers();
		const operation = withMigrationConnection(
			sourceEndpoint(),
			new AbortController().signal,
			() => new Promise(() => {})
		);
		const rejected = expect(operation).rejects.toThrow("Pinned SSH operation failed");
		await vi.advanceTimersByTimeAsync(120_000);
		await rejected;
	});
	it("rejects oversized raw output without returning it", async () => {
		ssh.execCommand.mockResolvedValue({ code: 0, stdout: "x".repeat(1024 * 1024 + 1), stderr: "" });
		await expect(
			withMigrationConnection(sourceEndpoint(), new AbortController().signal, (connection) =>
				connection.command(["dokku", "version"])
			)
		).rejects.toThrow("Pinned SSH operation failed");
	});
});
