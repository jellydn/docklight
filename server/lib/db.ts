import fs from "fs";
import path from "path";
import type { CommandResult } from "./executor.js";

type Statement = {
	run: (...args: unknown[]) => void;
	all: (...args: unknown[]) => unknown[];
	get: (...args: unknown[]) => unknown;
};

type Database = {
	prepare: (sql: string) => Statement;
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

	newDb.exec(`
	  CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'viewer',
		createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
	  )
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

// ---- User management ----

export type UserRole = "admin" | "operator" | "viewer";

export interface User {
	id: number;
	username: string;
	password_hash: string;
	role: UserRole;
	createdAt: string;
}

export interface SafeUser {
	id: number;
	username: string;
	role: UserRole;
	createdAt: string;
}

export function createUser(username: string, passwordHash: string, role: UserRole): SafeUser {
	const stmt = getDb().prepare(
		"INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
	);
	stmt.run(username, passwordHash, role);
	const user = getDb()
		.prepare("SELECT id, username, role, createdAt FROM users WHERE username = ?")
		.get(username) as SafeUser;
	return user;
}

export function getUserByUsername(username: string): User | null {
	const stmt = getDb().prepare(
		"SELECT id, username, password_hash, role, createdAt FROM users WHERE username = ?"
	);
	return (stmt.get(username) as User) ?? null;
}

export function getUserById(id: number): SafeUser | null {
	const stmt = getDb().prepare(
		"SELECT id, username, role, createdAt FROM users WHERE id = ?"
	);
	return (stmt.get(id) as SafeUser) ?? null;
}

export function getAllUsers(): SafeUser[] {
	const stmt = getDb().prepare(
		"SELECT id, username, role, createdAt FROM users ORDER BY createdAt ASC"
	);
	return stmt.all() as SafeUser[];
}

export function updateUser(id: number, updates: { role?: UserRole; passwordHash?: string }): void {
	if (updates.role !== undefined && updates.passwordHash !== undefined) {
		getDb()
			.prepare("UPDATE users SET role = ?, password_hash = ? WHERE id = ?")
			.run(updates.role, updates.passwordHash, id);
	} else if (updates.role !== undefined) {
		getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(updates.role, id);
	} else if (updates.passwordHash !== undefined) {
		getDb()
			.prepare("UPDATE users SET password_hash = ? WHERE id = ?")
			.run(updates.passwordHash, id);
	}
}

export function deleteUser(id: number): void {
	getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function getUserCount(): number {
	const result = getDb().prepare("SELECT COUNT(*) as count FROM users").get() as {
		count: number;
	};
	return result.count;
}
