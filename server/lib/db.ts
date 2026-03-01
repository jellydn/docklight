import fs from "fs";
import path from "path";
import type { CommandResult } from "./executor.js";

type Database = {
	prepare: (sql: string) => {
		run: (...args: unknown[]) => void;
		all: (...args: unknown[]) => CommandHistory[];
		get: (...args: unknown[]) => { count: number } | null;
	};
	exec: (sql: string) => void;
};

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const DB_PATH = path.join(DATA_DIR, "docklight.db");

if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database | null = null;

function getDb(): Database {
	if (db) return db;

	const Database = require("better-sqlite3");
	const newDb = new Database(DB_PATH);

	newDb.exec(`
	  CREATE TABLE IF NOT EXISTS command_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		command TEXT NOT NULL,
		exitCode INTEGER NOT NULL,
		stdout TEXT,
		stderr TEXT,
		createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
	  )
	`);

	// Create indexes for audit log query performance
	newDb.exec(`
	  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
	  CREATE INDEX IF NOT EXISTS idx_command_history_exitCode ON command_history(exitCode);
	  CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);
	`);

	db = newDb;
	return newDb;
}

// Validates ISO 8601 date string format
function isValidISODate(date: string): boolean {
	if (!date) return false;
	const d = new Date(date);
	return d instanceof Date && !Number.isNaN(d.getTime());
}

export interface CommandHistory {
	id: number;
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
	createdAt: string;
}

export function saveCommand(result: CommandResult): void {
	const stmt = getDb().prepare(`
    INSERT INTO command_history (command, exitCode, stdout, stderr)
    VALUES (?, ?, ?, ?)
  `);
	stmt.run(result.command, result.exitCode, result.stdout, result.stderr);
}

export function getRecentCommands(limit: number = 20): CommandHistory[] {
	const stmt = getDb().prepare(`
    SELECT id, command, exitCode, stdout, stderr, createdAt
    FROM command_history
    ORDER BY createdAt DESC
    LIMIT ?
  `);
	return stmt.all(limit) as CommandHistory[];
}

export interface AuditLogFilters {
	limit?: number;
	offset?: number;
	startDate?: string;
	endDate?: string;
	command?: string;
	exitCode?: "all" | "success" | "error";
}

export interface AuditLogResult {
	logs: CommandHistory[];
	total: number;
	limit: number;
	offset: number;
}

export function getAuditLogs(filters: AuditLogFilters = {}): AuditLogResult {
	const limit = Math.min(filters.limit ?? 50, 500);
	const offset = filters.offset ?? 0;

	// Build WHERE clause conditions
	const conditions: string[] = [];
	const params: (string | number)[] = [];

	if (filters.startDate && isValidISODate(filters.startDate)) {
		conditions.push("createdAt >= ?");
		params.push(filters.startDate);
	}

	if (filters.endDate && isValidISODate(filters.endDate)) {
		conditions.push("createdAt <= ?");
		params.push(filters.endDate);
	}

	if (filters.command) {
		conditions.push("command LIKE ?");
		params.push(`%${filters.command}%`);
	}

	if (filters.exitCode === "success") {
		conditions.push("exitCode = 0");
	} else if (filters.exitCode === "error") {
		conditions.push("exitCode != 0");
	}

	// Build WHERE clause
	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	// Get total count
	const countStmt = getDb().prepare(`SELECT COUNT(*) as count FROM command_history ${whereClause}`);
	const countResult = countStmt.get(...params) as { count: number };
	const total = countResult.count;

	// Get paginated results
	const dataStmt = getDb().prepare(
		`SELECT id, command, exitCode, stdout, stderr, createdAt
		 FROM command_history
		 ${whereClause}
		 ORDER BY createdAt DESC
		 LIMIT ? OFFSET ?`
	);
	const logs = dataStmt.all(...params, limit, offset) as CommandHistory[];

	return {
		logs,
		total,
		limit,
		offset,
	};
}
