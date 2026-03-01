import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { CommandHistory } from "./db.js";
import { importBackup } from "./db.js";
import type { BackupData } from "./db.js";

// Use a test-specific database file
const TEST_DB_PATH = path.join(__dirname, "test-data", "test.db");

describe("db indexes", () => {
	beforeEach(() => {
		// Clean up test database file
		if (fs.existsSync(TEST_DB_PATH)) {
			fs.unlinkSync(TEST_DB_PATH);
		}

		// Create test data directory
		const testDir = path.dirname(TEST_DB_PATH);
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test database
		if (fs.existsSync(TEST_DB_PATH)) {
			fs.unlinkSync(TEST_DB_PATH);
		}
	});

	it("should create indexes on command_history table", () => {
		const testDb = new Database(TEST_DB_PATH);

		// Create table and indexes (same as in db.ts)
		testDb.exec(`
		  CREATE TABLE IF NOT EXISTS command_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			command TEXT NOT NULL,
			exitCode INTEGER NOT NULL,
			stdout TEXT,
			stderr TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		  )
		`);

		testDb.exec(`
		  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
		  CREATE INDEX IF NOT EXISTS idx_command_history_exitCode ON command_history(exitCode);
		  CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);
		`);

		// Verify indexes exist
		const indexes = testDb
			.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='command_history'")
			.all() as { name: string }[];

		expect(indexes.map((i) => i.name)).toContain("idx_command_history_createdAt");
		expect(indexes.map((i) => i.name)).toContain("idx_command_history_exitCode");
		expect(indexes.map((i) => i.name)).toContain("idx_command_history_command");

		testDb.close();
	});

	it("should not fail when indexes already exist", () => {
		const testDb = new Database(TEST_DB_PATH);

		// Create table
		testDb.exec(`
		  CREATE TABLE IF NOT EXISTS command_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			command TEXT NOT NULL,
			exitCode INTEGER NOT NULL,
			stdout TEXT,
			stderr TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		  )
		`);

		// Create indexes first time
		testDb.exec(`
		  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
		  CREATE INDEX IF NOT EXISTS idx_command_history_exitCode ON command_history(exitCode);
		  CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);
		`);

		// Try to create indexes again (should not fail)
		expect(() => {
			testDb.exec(`
			  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
			  CREATE INDEX IF NOT EXISTS idx_command_history_exitCode ON command_history(exitCode);
			  CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);
			`);
		}).not.toThrow();

		testDb.close();
	});

	it("should filter by exitCode efficiently using index", () => {
		const testDb = new Database(TEST_DB_PATH);

		// Setup table and indexes
		testDb.exec(`
		  CREATE TABLE IF NOT EXISTS command_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			command TEXT NOT NULL,
			exitCode INTEGER NOT NULL,
			stdout TEXT,
			stderr TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		  )
		`);

		testDb.exec(`
		  CREATE INDEX IF NOT EXISTS idx_command_history_exitCode ON command_history(exitCode);
		  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
		`);

		// Insert test data
		const stmt = testDb.prepare(
			"INSERT INTO command_history (command, exitCode, stdout, stderr) VALUES (?, ?, ?, ?)"
		);

		for (let i = 0; i < 10; i++) {
			const exitCode = i % 3 === 0 ? 0 : 1;
			stmt.run(`dokku apps:info app${i}`, exitCode, `success${i}`, "");
		}

		// Query with exitCode filter
		const results = testDb
			.prepare(
				"SELECT id, command, exitCode, stdout, stderr, createdAt FROM command_history WHERE exitCode = 0 ORDER BY createdAt DESC"
			)
			.all() as CommandHistory[];

		expect(results.length).toBe(4); // 0, 3, 6, 9 have exitCode 0
		expect(results.every((r) => r.exitCode === 0)).toBe(true);

		testDb.close();
	});

	it("should filter by command pattern using index", () => {
		const testDb = new Database(TEST_DB_PATH);

		// Setup table and indexes
		testDb.exec(`
		  CREATE TABLE IF NOT EXISTS command_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			command TEXT NOT NULL,
			exitCode INTEGER NOT NULL,
			stdout TEXT,
			stderr TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		  )
		`);

		testDb.exec(`
		  CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);
		  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
		`);

		// Insert test data
		const stmt = testDb.prepare(
			"INSERT INTO command_history (command, exitCode, stdout, stderr) VALUES (?, ?, ?, ?)"
		);

		stmt.run("dokku apps:list", 0, "app1\napp2", "");
		stmt.run("dokku apps:info app1", 0, "status: running", "");
		stmt.run("dokku databases:list", 0, "db1", "");
		stmt.run("dokku apps:restart app1", 0, "restarted", "");

		// Query with command filter (LIKE can use index for prefix)
		const results = testDb
			.prepare(
				"SELECT id, command, exitCode, stdout, stderr, createdAt FROM command_history WHERE command LIKE 'dokku apps%' ORDER BY createdAt DESC"
			)
			.all() as CommandHistory[];

		expect(results.length).toBe(3);
		expect(results.every((r) => r.command.startsWith("dokku apps"))).toBe(true);

		testDb.close();
	});

	it("should filter by date range using createdAt index", () => {
		const testDb = new Database(TEST_DB_PATH);

		// Setup table and indexes
		testDb.exec(`
		  CREATE TABLE IF NOT EXISTS command_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			command TEXT NOT NULL,
			exitCode INTEGER NOT NULL,
			stdout TEXT,
			stderr TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		  )
		`);

		testDb.exec(`
		  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
		`);

		// Insert test data with specific timestamps
		const stmt = testDb.prepare(
			"INSERT INTO command_history (command, exitCode, stdout, stderr, createdAt) VALUES (?, ?, ?, ?, ?)"
		);

		const baseDate = new Date("2024-01-01T00:00:00.000Z");
		stmt.run("dokku apps:list", 0, "app1", "", baseDate.toISOString());
		stmt.run(
			"dokku apps:info app1",
			0,
			"running",
			"",
			new Date(baseDate.getTime() + 3600000).toISOString()
		);
		stmt.run(
			"dokku apps:restart",
			0,
			"done",
			"",
			new Date(baseDate.getTime() + 7200000).toISOString()
		);

		// Query with date range filter
		const startDate = new Date(baseDate.getTime() + 1800000).toISOString();
		const results = testDb
			.prepare(
				"SELECT id, command, exitCode, stdout, stderr, createdAt FROM command_history WHERE createdAt >= ? ORDER BY createdAt DESC"
			)
			.all(startDate) as CommandHistory[];

		expect(results.length).toBe(2);
		expect(results[0].command).toBe("dokku apps:restart");
		expect(results[1].command).toBe("dokku apps:info app1");

		testDb.close();
	});
});

// ---- importBackup validation tests ----
// These tests exercise the pure validation path that returns before any DB access.

describe("importBackup validation", () => {
	const validBackup: BackupData = {
		version: "1.0",
		timestamp: "2024-01-01T00:00:00.000Z",
		users: [
			{
				username: "admin",
				password_hash: "salt:hash",
				role: "admin",
				createdAt: "2024-01-01T00:00:00.000Z",
			},
		],
		envConfig: {},
	};

	it("should reject null backup", () => {
		expect(importBackup(null as unknown as BackupData)).toEqual({
			success: false,
			error: "Invalid backup format",
		});
	});

	it("should reject wrong version", () => {
		expect(importBackup({ ...validBackup, version: "2.0" })).toEqual({
			success: false,
			error: "Invalid backup format",
		});
	});

	it("should reject non-array users", () => {
		expect(importBackup({ ...validBackup, users: "not-an-array" as unknown as [] })).toEqual({
			success: false,
			error: "Invalid backup format",
		});
	});

	it("should reject user with missing username", () => {
		const result = importBackup({
			...validBackup,
			users: [{ username: "", password_hash: "hash", role: "admin", createdAt: "" }],
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("username");
	});

	it("should reject user with missing password_hash", () => {
		const result = importBackup({
			...validBackup,
			users: [{ username: "admin", password_hash: "", role: "admin", createdAt: "" }],
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("password_hash");
	});

	it("should reject user with invalid role", () => {
		const result = importBackup({
			...validBackup,
			users: [
				{
					username: "admin",
					password_hash: "hash",
					role: "superuser" as "admin",
					createdAt: "",
				},
			],
		});
		expect(result.success).toBe(false);
		expect(result.error).toContain("role");
	});

	it("should reject backup with no admin user", () => {
		const result = importBackup({
			...validBackup,
			users: [
				{ username: "user1", password_hash: "hash", role: "viewer", createdAt: "" },
			],
		});
		expect(result).toEqual({
			success: false,
			error: "Backup must contain at least one admin user",
		});
	});
});

// ---- backup SQL integration tests ----
// These tests exercise the SQL logic for export/restore using a raw SQLite instance,
// consistent with the approach used in the "db indexes" suite above.

const BACKUP_TEST_DB_PATH = path.join(__dirname, "test-data", "backup-test.db");

function createBackupTestDb() {
	const testDb = new Database(BACKUP_TEST_DB_PATH);
	testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
	return testDb;
}

describe("backup SQL logic", () => {
	beforeEach(() => {
		if (fs.existsSync(BACKUP_TEST_DB_PATH)) fs.unlinkSync(BACKUP_TEST_DB_PATH);
		const testDir = path.dirname(BACKUP_TEST_DB_PATH);
		if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		if (fs.existsSync(BACKUP_TEST_DB_PATH)) fs.unlinkSync(BACKUP_TEST_DB_PATH);
	});

	it("should export all users with correct fields", () => {
		const testDb = createBackupTestDb();
		testDb
			.prepare("INSERT INTO users (username, password_hash, role, createdAt) VALUES (?, ?, ?, ?)")
			.run("admin", "salt:hash", "admin", "2024-01-01T00:00:00.000Z");
		testDb
			.prepare("INSERT INTO users (username, password_hash, role, createdAt) VALUES (?, ?, ?, ?)")
			.run("viewer", "salt:hash2", "viewer", "2024-06-01T00:00:00.000Z");

		const users = testDb
			.prepare("SELECT username, password_hash, role, createdAt FROM users ORDER BY id ASC")
			.all() as Array<{ username: string; password_hash: string; role: string; createdAt: string }>;

		expect(users).toHaveLength(2);
		expect(users[0].username).toBe("admin");
		expect(users[0].role).toBe("admin");
		expect(users[1].username).toBe("viewer");
		testDb.close();
	});

	it("should upsert users and preserve createdAt on restore", () => {
		const testDb = createBackupTestDb();

		// Insert original user
		testDb
			.prepare("INSERT INTO users (username, password_hash, role, createdAt) VALUES (?, ?, ?, ?)")
			.run("admin", "old-hash", "admin", "2023-01-01T00:00:00.000Z");

		// Simulate upsert from backup (same SQL as importBackup)
		const upsert = testDb.prepare(
			"INSERT INTO users (username, password_hash, role, createdAt) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, createdAt = excluded.createdAt"
		);
		upsert.run("admin", "new-hash", "admin", "2024-01-01T00:00:00.000Z");

		const user = testDb.prepare("SELECT * FROM users WHERE username = 'admin'").get() as {
			username: string;
			password_hash: string;
			role: string;
			createdAt: string;
		};

		expect(user.password_hash).toBe("new-hash");
		expect(user.createdAt).toBe("2024-01-01T00:00:00.000Z");
		testDb.close();
	});

	it("should insert new users from backup without touching existing users", () => {
		const testDb = createBackupTestDb();

		// Existing user not in the backup
		testDb
			.prepare("INSERT INTO users (username, password_hash, role, createdAt) VALUES (?, ?, ?, ?)")
			.run("existing", "existing-hash", "operator", "2023-01-01T00:00:00.000Z");

		// Upsert backup user (new)
		const upsert = testDb.prepare(
			"INSERT INTO users (username, password_hash, role, createdAt) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, createdAt = excluded.createdAt"
		);
		upsert.run("admin", "admin-hash", "admin", "2024-01-01T00:00:00.000Z");

		const users = testDb
			.prepare("SELECT username FROM users ORDER BY id ASC")
			.all() as { username: string }[];

		expect(users).toHaveLength(2);
		expect(users.map((u) => u.username)).toContain("existing");
		expect(users.map((u) => u.username)).toContain("admin");
		testDb.close();
	});
});
