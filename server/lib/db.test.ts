import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import type { CommandHistory } from "./db.js";

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
