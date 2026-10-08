import fs from "fs";
import path from "path";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export function migrationDirectory(): string {
	return path.join(
		path.dirname(path.resolve(process.env.DOCKLIGHT_DB_PATH || "data/docklight.db")),
		"migration"
	);
}

function encryptionKey(): Buffer {
	const key = process.env.DOCKLIGHT_MIGRATION_ENCRYPTION_KEY || "";
	if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("Migration encryption key is not configured.");
	return Buffer.from(key, "hex");
}

export function sealMigrationData(value: unknown): Buffer {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
	const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
	return Buffer.from(
		JSON.stringify({
			version: 1,
			iv: iv.toString("hex"),
			tag: cipher.getAuthTag().toString("hex"),
			data: data.toString("base64"),
		})
	);
}

export function openMigrationData<T>(data: Buffer): T {
	try {
		const envelope = JSON.parse(data.toString("utf8"));
		if (envelope.version !== 1) throw new Error();
		const cipher = createDecipheriv(
			"aes-256-gcm",
			encryptionKey(),
			Buffer.from(envelope.iv, "hex")
		);
		cipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
		return JSON.parse(
			Buffer.concat([cipher.update(Buffer.from(envelope.data, "base64")), cipher.final()]).toString(
				"utf8"
			)
		) as T;
	} catch {
		throw new Error("Migration storage is unavailable. Check the server-side encryption key.");
	}
}

export function readMigrationFile<T>(name: string): T | null {
	const filename = path.join(migrationDirectory(), name);
	if (!fs.existsSync(filename)) return null;
	return openMigrationData<T>(fs.readFileSync(filename));
}

export function writeMigrationFile(name: string, value: unknown): void {
	const data = sealMigrationData(value);
	fs.mkdirSync(migrationDirectory(), { recursive: true, mode: 0o700 });
	const filename = path.join(migrationDirectory(), name);
	const temporary = `${filename}.tmp`;
	fs.writeFileSync(temporary, data, { mode: 0o600 });
	fs.renameSync(temporary, filename);
}
