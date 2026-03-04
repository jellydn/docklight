import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

export interface ServerSettings {
	dokkuSshTarget: string;
	dokkuSshKeyPath: string;
	logLevel: string;
}

const VALID_LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace"];

const DB_PATH = process.env.DOCKLIGHT_DB_PATH || path.join("data", "docklight.db");
const DATA_DIR = path.dirname(path.resolve(DB_PATH));
const SETTINGS_FILE = path.join(DATA_DIR, "server-settings.json");

const DEFAULTS: ServerSettings = {
	dokkuSshTarget: "",
	dokkuSshKeyPath: "",
	logLevel: "info",
};

function readSettingsFile(): Partial<ServerSettings> {
	try {
		if (!fs.existsSync(SETTINGS_FILE)) {
			return {};
		}
		const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			logger.warn("Server settings file has invalid shape, using defaults");
			return {};
		}
		return parsed as Partial<ServerSettings>;
	} catch (err) {
		logger.warn({ err }, "Failed to read server settings file, using defaults");
		return {};
	}
}

function writeSettingsFile(settings: Partial<ServerSettings>): void {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
	const backup = `${SETTINGS_FILE}.bak`;
	if (fs.existsSync(SETTINGS_FILE)) {
		fs.copyFileSync(SETTINGS_FILE, backup);
	}
	fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export function getSettings(): ServerSettings {
	const fileSettings = readSettingsFile();
	return {
		dokkuSshTarget:
			fileSettings.dokkuSshTarget ??
			process.env.DOCKLIGHT_DOKKU_SSH_TARGET?.trim() ??
			DEFAULTS.dokkuSshTarget,
		dokkuSshKeyPath:
			fileSettings.dokkuSshKeyPath ??
			process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH?.trim() ??
			DEFAULTS.dokkuSshKeyPath,
		logLevel: fileSettings.logLevel ?? process.env.LOG_LEVEL ?? DEFAULTS.logLevel,
	};
}

export interface SettingsValidationError {
	field: string;
	message: string;
}

export function validateSettings(input: Partial<ServerSettings>): SettingsValidationError[] {
	const errors: SettingsValidationError[] = [];

	if (input.logLevel !== undefined) {
		if (!VALID_LOG_LEVELS.includes(input.logLevel)) {
			errors.push({
				field: "logLevel",
				message: `Must be one of: ${VALID_LOG_LEVELS.join(", ")}`,
			});
		}
	}

	return errors;
}

export function updateSettings(updates: Partial<ServerSettings>): void {
	const existing = readSettingsFile();
	const merged: Partial<ServerSettings> = { ...existing };

	if (updates.dokkuSshTarget !== undefined) {
		merged.dokkuSshTarget = updates.dokkuSshTarget;
	}
	if (updates.dokkuSshKeyPath !== undefined) {
		merged.dokkuSshKeyPath = updates.dokkuSshKeyPath;
	}
	if (updates.logLevel !== undefined) {
		merged.logLevel = updates.logLevel;
	}

	writeSettingsFile(merged);

	if (updates.dokkuSshTarget !== undefined) {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = updates.dokkuSshTarget;
	}
	if (updates.dokkuSshKeyPath !== undefined) {
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = updates.dokkuSshKeyPath;
	}
	if (updates.logLevel !== undefined) {
		process.env.LOG_LEVEL = updates.logLevel;
		logger.level = updates.logLevel;
	}

	logger.info({ updates: Object.keys(updates) }, "Server settings updated");
}
