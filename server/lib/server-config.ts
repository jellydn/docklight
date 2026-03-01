import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
const CONFIG_PATH = path.join(DATA_DIR, "server-config.json");

export interface ServerConfig {
	dokkuSshTarget: string;
	dokkuSshRootTarget: string;
	dokkuSshKeyPath: string;
	dokkuSshOpts: string;
	logLevel: string;
}

const VALID_LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal", "silent"];

export function getServerConfig(): ServerConfig {
	let fileConfig: Partial<ServerConfig> = {};

	if (fs.existsSync(CONFIG_PATH)) {
		try {
			const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
			fileConfig = JSON.parse(raw) as Partial<ServerConfig>;
		} catch (err) {
			logger.warn({ err }, "Failed to read server config file, using env var defaults");
		}
	}

	return {
		dokkuSshTarget: fileConfig.dokkuSshTarget ?? process.env.DOCKLIGHT_DOKKU_SSH_TARGET ?? "",
		dokkuSshRootTarget:
			fileConfig.dokkuSshRootTarget ?? process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET ?? "",
		dokkuSshKeyPath: fileConfig.dokkuSshKeyPath ?? process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH ?? "",
		dokkuSshOpts: fileConfig.dokkuSshOpts ?? process.env.DOCKLIGHT_DOKKU_SSH_OPTS ?? "",
		logLevel: fileConfig.logLevel ?? process.env.LOG_LEVEL ?? "info",
	};
}

export function validateServerConfig(updates: Partial<ServerConfig>): string | null {
	if (updates.logLevel !== undefined && !VALID_LOG_LEVELS.includes(updates.logLevel)) {
		return `Invalid log level. Must be one of: ${VALID_LOG_LEVELS.join(", ")}`;
	}

	if (updates.dokkuSshTarget?.trim()) {
		if (!updates.dokkuSshTarget.includes("@")) {
			return "dokkuSshTarget must be in format user@host or user@host:port";
		}
	}

	if (updates.dokkuSshRootTarget?.trim()) {
		if (!updates.dokkuSshRootTarget.includes("@")) {
			return "dokkuSshRootTarget must be in format user@host or user@host:port";
		}
	}

	return null;
}

export function updateServerConfig(updates: Partial<ServerConfig>): void {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}

	// Create backup before writing
	if (fs.existsSync(CONFIG_PATH)) {
		fs.copyFileSync(CONFIG_PATH, `${CONFIG_PATH}.bak`);
	}

	let currentConfig: Partial<ServerConfig> = {};
	if (fs.existsSync(CONFIG_PATH)) {
		try {
			currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Partial<ServerConfig>;
		} catch {
			// Start fresh if file is corrupted
		}
	}

	const newConfig = { ...currentConfig, ...updates };
	fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");

	// Apply to process.env for hot-reload (without server restart)
	if (updates.dokkuSshTarget !== undefined) {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = updates.dokkuSshTarget;
	}
	if (updates.dokkuSshRootTarget !== undefined) {
		process.env.DOCKLIGHT_DOKKU_SSH_ROOT_TARGET = updates.dokkuSshRootTarget;
	}
	if (updates.dokkuSshKeyPath !== undefined) {
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = updates.dokkuSshKeyPath;
	}
	if (updates.dokkuSshOpts !== undefined) {
		process.env.DOCKLIGHT_DOKKU_SSH_OPTS = updates.dokkuSshOpts;
	}
	if (updates.logLevel !== undefined) {
		process.env.LOG_LEVEL = updates.logLevel;
	}

	logger.info({ fields: Object.keys(updates) }, "Server configuration updated");
}
