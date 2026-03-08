import fs from "fs";
import path from "path";
import type { CommandResult } from "./executor.js";

const MAX_OUTPUT_SIZE = 4096;
const TRUNCATION_INDICATOR = "\n... [output truncated]";

type Statement = {
	run: (...args: unknown[]) => void;
	all: (...args: unknown[]) => unknown[];
	get: (...args: unknown[]) => unknown;
};

type Database = {
	prepare: (sql: string) => Statement;
	exec: (sql: string) => void;
	transaction: <T>(fn: (arg: T) => void) => (arg: T) => void;
};

interface UserRoleRow {
	role: UserRole;
}

const DB_PATH = path.resolve(process.env.DOCKLIGHT_DB_PATH || path.join("data", "docklight.db"));
const DATA_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database | null = null;

function getDb(): Database {
	if (db) return db;

	const Database = require("better-sqlite3");
	const newDb = new Database(DB_PATH);

	newDb.pragma("journal_mode = WAL");
	newDb.pragma("synchronous = NORMAL");

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
	// Note: SQLite CURRENT_TIMESTAMP returns UTC (YYYY-MM-DD HH:MM:SS format)

	// Create indexes for audit log query performance
	newDb.exec(`
	  CREATE INDEX IF NOT EXISTS idx_command_history_createdAt ON command_history(createdAt);
	  CREATE INDEX IF NOT EXISTS idx_command_history_exitCode ON command_history(exitCode);
	  CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);
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
	// Note: SQLite CURRENT_TIMESTAMP returns UTC (YYYY-MM-DD HH:MM:SS format)

	// Create audit_log table for RBAC user action auditing
	newDb.exec(`
	  CREATE TABLE IF NOT EXISTS audit_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER,
		action TEXT NOT NULL,
		resource TEXT,
		details TEXT,
		ip_address TEXT,
		createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
	  )
	`);
	// Note: SQLite CURRENT_TIMESTAMP returns UTC (YYYY-MM-DD HH:MM:SS format)

	// Create indexes for audit_log performance
	newDb.exec(`
	  CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
	  CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
	  CREATE INDEX IF NOT EXISTS idx_audit_log_createdAt ON audit_log(createdAt);
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

/**
 * Normalizes an end date filter to ISO 8601 format.
 * If the date is date-only (YYYY-MM-DD), appends end-of-day time.
 */
function normalizeEndDateFilter(endDate: string): string {
	return /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? `${endDate}T23:59:59.999Z` : endDate;
}

function buildDateRangeConditions(
	filters: { startDate?: string; endDate?: string },
	conditions: string[],
	params: (string | number)[]
): void {
	if (filters.startDate && isValidISODate(filters.startDate)) {
		conditions.push("datetime(createdAt) >= datetime(?)");
		params.push(filters.startDate);
	}

	if (filters.endDate && isValidISODate(filters.endDate)) {
		const endDate = normalizeEndDateFilter(filters.endDate);
		conditions.push("datetime(createdAt) <= datetime(?)");
		params.push(endDate);
	}
}

function buildWhereClause(conditions: string[]): string {
	return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

export interface CommandHistory {
	id: number;
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
	createdAt: string;
}

function truncateOutput(output: string): string {
	if (output.length <= MAX_OUTPUT_SIZE) {
		return output;
	}
	const indicatorLength = TRUNCATION_INDICATOR.length;
	const truncateAt = MAX_OUTPUT_SIZE - indicatorLength;
	return output.slice(0, truncateAt) + TRUNCATION_INDICATOR;
}

export function saveCommand(result: CommandResult): void {
	const stmt = getDb().prepare(`
    INSERT INTO command_history (command, exitCode, stdout, stderr)
    VALUES (?, ?, ?, ?)
  `);
	const truncatedStdout = truncateOutput(result.stdout);
	const truncatedStderr = truncateOutput(result.stderr);
	stmt.run(result.command, result.exitCode, truncatedStdout, truncatedStderr);
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

	const conditions: string[] = [];
	const params: (string | number)[] = [];

	buildDateRangeConditions(filters, conditions, params);

	if (filters.command) {
		conditions.push("command LIKE ?");
		params.push(`%${filters.command}%`);
	}

	if (filters.exitCode === "success") {
		conditions.push("exitCode = 0");
	} else if (filters.exitCode === "error") {
		conditions.push("exitCode != 0");
	}

	const whereClause = buildWhereClause(conditions);

	const countStmt = getDb().prepare(`SELECT COUNT(*) as count FROM command_history ${whereClause}`);
	const countResult = countStmt.get(...params) as { count: number };
	const total = countResult.count;

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
	const stmt = getDb().prepare("SELECT id, username, role, createdAt FROM users WHERE id = ?");
	return (stmt.get(id) as SafeUser) ?? null;
}

export function getAllUsers(): SafeUser[] {
	const stmt = getDb().prepare(
		"SELECT id, username, role, createdAt FROM users ORDER BY createdAt ASC"
	);
	return stmt.all() as SafeUser[];
}

export function updateUser(id: number, updates: { role?: UserRole; passwordHash?: string }): void {
	const fields: string[] = [];
	const params: unknown[] = [];

	if (updates.role !== undefined) {
		fields.push("role = ?");
		params.push(updates.role);
	}
	if (updates.passwordHash !== undefined) {
		fields.push("password_hash = ?");
		params.push(updates.passwordHash);
	}

	if (fields.length === 0) return;

	params.push(id);
	const stmt = getDb().prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`);
	stmt.run(...params);
}

export function demoteAdminWithGuard(
	id: number,
	newRole: UserRole
): { success: boolean; error?: string } {
	const db = getDb();

	const adminBefore = db
		.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
		.get() as { count: number };

	if (adminBefore.count <= 1) {
		return { success: false, error: "Cannot demote the last admin user" };
	}

	db.prepare("UPDATE users SET role = ? WHERE id = ? AND role = 'admin'").run(newRole, id);

	const adminAfter = db
		.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
		.get() as { count: number };

	if (adminAfter.count >= adminBefore.count) {
		return { success: false, error: "Cannot demote the last admin user" };
	}

	return { success: true };
}

export function deleteUserWithAdminGuard(id: number): { success: boolean; error?: string } {
	const db = getDb();

	const user = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as UserRoleRow | undefined;

	if (!user) {
		return { success: false, error: "User not found" };
	}

	if (user.role === "admin") {
		const adminCount = db
			.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
			.get() as { count: number };

		if (adminCount.count <= 1) {
			return { success: false, error: "Cannot delete the last admin user" };
		}
	}

	db.prepare("DELETE FROM users WHERE id = ?").run(id);

	return { success: true };
}

export function deleteUser(id: number): void {
	getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function pingDb(): void {
	getDb().prepare("SELECT 1").get();
}

export function getUserCount(): number {
	const result = getDb().prepare("SELECT COUNT(*) as count FROM users").get() as {
		count: number;
	};
	return result.count;
}

export function getAdminCount(): number {
	const result = getDb()
		.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
		.get() as {
		count: number;
	};
	return result.count;
}

export interface AuditLog {
	id: number;
	userId: number | null;
	action: string;
	resource: string | null;
	details: string | null;
	ipAddress: string | null;
	createdAt: string;
}

export interface UserAuditLogFilters {
	limit?: number;
	offset?: number;
	userId?: number;
	action?: string;
	startDate?: string;
	endDate?: string;
}

export interface UserAuditLogResult {
	logs: AuditLog[];
	total: number;
	limit: number;
	offset: number;
}

export function insertAuditLog(
	userId: number | null,
	action: string,
	resource: string | null = null,
	details: string | null = null,
	ipAddress: string | null = null
): void {
	const stmt = getDb().prepare(`
    INSERT INTO audit_log (user_id, action, resource, details, ip_address)
    VALUES (?, ?, ?, ?, ?)
  `);
	stmt.run(userId, action, resource, details, ipAddress);
}

// ---- Backup / Restore ----

export interface BackupUser {
	username: string;
	password_hash: string;
	role: UserRole;
	createdAt: string;
}

export interface BackupData {
	version: string;
	timestamp: string;
	users: BackupUser[];
	envConfig: Record<string, boolean>;
}

const ENV_VARS_TO_REFERENCE = [
	"JWT_SECRET",
	"DOCKLIGHT_DOKKU_SSH_TARGET",
	"DOCKLIGHT_DOKKU_SSH_KEY_PATH",
	"DOCKLIGHT_DOKKU_SSH_OPTS",
	"LOG_LEVEL",
	"NODE_ENV",
];

export function exportBackup(): BackupData {
	const users = getDb()
		.prepare("SELECT username, password_hash, role, createdAt FROM users ORDER BY id ASC")
		.all() as BackupUser[];

	const envConfig: Record<string, boolean> = {};
	for (const key of ENV_VARS_TO_REFERENCE) {
		envConfig[key] = process.env[key] !== undefined;
	}

	return {
		version: "1.0",
		timestamp: new Date().toISOString(),
		users,
		envConfig,
	};
}

const VALID_ROLES: UserRole[] = ["admin", "operator", "viewer"];

export function importBackup(backup: BackupData): { success: boolean; error?: string } {
	if (!backup || backup.version !== "1.0" || !Array.isArray(backup.users)) {
		return { success: false, error: "Invalid backup format" };
	}

	for (const user of backup.users) {
		if (!user.username || typeof user.username !== "string") {
			return { success: false, error: "Invalid user: username must be a non-empty string" };
		}
		if (!user.password_hash || typeof user.password_hash !== "string") {
			return { success: false, error: "Invalid user: password_hash must be a non-empty string" };
		}
		if (!VALID_ROLES.includes(user.role)) {
			return {
				success: false,
				error: `Invalid user: role must be one of ${VALID_ROLES.join(", ")}`,
			};
		}
	}

	const hasAdmin = backup.users.some((u) => u.role === "admin");
	if (!hasAdmin) {
		return { success: false, error: "Backup must contain at least one admin user" };
	}

	const db = getDb();
	const upsert = db.prepare(
		"INSERT INTO users (username, password_hash, role, createdAt) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, createdAt = excluded.createdAt"
	);

	try {
		const transaction = db.transaction((users: BackupUser[]) => {
			for (const user of users) {
				upsert.run(user.username, user.password_hash, user.role, user.createdAt);
			}
		});
		transaction(backup.users);
		return { success: true };
	} catch (error: unknown) {
		const err = error as { message?: string };
		return { success: false, error: err.message ?? "Failed to restore backup" };
	}
}

export function deleteOldAuditLogs(olderThanDays: number): number {
	const stmt = getDb().prepare(
		"DELETE FROM audit_log WHERE datetime(createdAt) <= datetime('now', ?)"
	);
	const result = stmt.run(`-${olderThanDays} days`) as unknown as { changes: number };
	return result.changes;
}

export function deleteOldCommandHistory(olderThanDays: number): number {
	const stmt = getDb().prepare(
		"DELETE FROM command_history WHERE datetime(createdAt) <= datetime('now', ?)"
	);
	const result = stmt.run(`-${olderThanDays} days`) as unknown as { changes: number };
	return result.changes;
}

export function getCommandHistoryForExport(filters: AuditLogFilters = {}): CommandHistory[] {
	const conditions: string[] = [];
	const params: (string | number)[] = [];

	buildDateRangeConditions(filters, conditions, params);

	if (filters.command) {
		conditions.push("command LIKE ?");
		params.push(`%${filters.command}%`);
	}

	if (filters.exitCode === "success") {
		conditions.push("exitCode = 0");
	} else if (filters.exitCode === "error") {
		conditions.push("exitCode != 0");
	}

	const whereClause = buildWhereClause(conditions);
	const stmt = getDb().prepare(
		`SELECT id, command, exitCode, stdout, stderr, createdAt
		 FROM command_history
		 ${whereClause}
		 ORDER BY createdAt DESC`
	);
	return stmt.all(...params) as CommandHistory[];
}

export function getUserAuditLogsForExport(filters: UserAuditLogFilters = {}): AuditLog[] {
	const conditions: string[] = [];
	const params: (string | number)[] = [];

	if (filters.userId !== undefined) {
		conditions.push("user_id = ?");
		params.push(filters.userId);
	}

	if (filters.action) {
		conditions.push("action = ?");
		params.push(filters.action);
	}

	buildDateRangeConditions(filters, conditions, params);

	const whereClause = buildWhereClause(conditions);
	const stmt = getDb().prepare(
		`SELECT id, user_id as userId, action, resource, details, ip_address as ipAddress,
		        strftime('%Y-%m-%dT%H:%M:%SZ', createdAt) as createdAt
		 FROM audit_log
		 ${whereClause}
		 ORDER BY createdAt DESC`
	);
	return stmt.all(...params) as AuditLog[];
}

export function getUserAuditLogs(filters: UserAuditLogFilters = {}): UserAuditLogResult {
	const limit = Math.min(filters.limit ?? 50, 500);
	const offset = filters.offset ?? 0;

	const conditions: string[] = [];
	const params: (number | string)[] = [];

	if (filters.userId !== undefined) {
		conditions.push("user_id = ?");
		params.push(filters.userId);
	}

	if (filters.action) {
		conditions.push("action = ?");
		params.push(filters.action);
	}

	buildDateRangeConditions(filters, conditions, params);

	const whereClause = buildWhereClause(conditions);

	const countStmt = getDb().prepare(`SELECT COUNT(*) as count FROM audit_log ${whereClause}`);
	const countResult = countStmt.get(...params) as { count: number };
	const total = countResult.count;

	const dataStmt = getDb().prepare(
		`SELECT id, user_id as userId, action, resource, details, ip_address as ipAddress,
		        strftime('%Y-%m-%dT%H:%M:%SZ', createdAt) as createdAt
		 FROM audit_log
		 ${whereClause}
		 ORDER BY createdAt DESC
		 LIMIT ? OFFSET ?`
	);
	const logs = dataStmt.all(...params, limit, offset) as AuditLog[];

	return {
		logs,
		total,
		limit,
		offset,
	};
}
