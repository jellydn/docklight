import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { CommandResult } from "./executor.js";

const DATA_DIR = path.join(process.cwd(), "..", "data");
const DB_PATH = path.join(DATA_DIR, "docklight.db");

if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS command_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    exitCode INTEGER NOT NULL,
    stdout TEXT,
    stderr TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface CommandHistory {
	id: number;
	command: string;
	exitCode: number;
	stdout: string;
	stderr: string;
	createdAt: string;
}

export function saveCommand(result: CommandResult): void {
	const stmt = db.prepare(`
    INSERT INTO command_history (command, exitCode, stdout, stderr)
    VALUES (?, ?, ?, ?)
  `);
	stmt.run(result.command, result.exitCode, result.stdout, result.stderr);
}

export function getRecentCommands(limit: number = 20): CommandHistory[] {
	const stmt = db.prepare(`
    SELECT id, command, exitCode, stdout, stderr, createdAt
    FROM command_history
    ORDER BY createdAt DESC
    LIMIT ?
  `);
	return stmt.all(limit) as CommandHistory[];
}
