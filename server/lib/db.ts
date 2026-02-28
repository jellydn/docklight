import fs from "fs";
import path from "path";
import type { CommandResult } from "./executor.js";

type Database = {
	prepare: (sql: string) => {
		run: (...args: unknown[]) => void;
		all: (limit: number) => CommandHistory[];
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
	if (!db) {
		const Database = require("better-sqlite3");
		db = new Database(DB_PATH);
		db?.exec(`
		  CREATE TABLE IF NOT EXISTS command_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			command TEXT NOT NULL,
			exitCode INTEGER NOT NULL,
			stdout TEXT,
			stderr TEXT,
			createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
		  )
		`);
	}
	if (!db) {
		throw new Error("Failed to initialize database");
	}
	return db;
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
