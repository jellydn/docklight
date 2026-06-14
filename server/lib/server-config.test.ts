import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";

vi.mock("./logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

vi.mock("fs", async () => {
	const actual = await vi.importActual<typeof import("fs")>("fs");
	return {
		...actual,
		default: {
			...actual,
			existsSync: vi.fn(),
			readFileSync: vi.fn(),
			writeFileSync: vi.fn(),
			copyFileSync: vi.fn(),
			mkdirSync: vi.fn(),
		},
	};
});

const mockFs = vi.mocked(fs);

import { getSettings } from "./server-config.js";

describe("getSettings", () => {
	const OLD_ENV = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...OLD_ENV };
		delete process.env.DOCKLIGHT_DOKKU_SSH_TARGET;
		delete process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH;
		delete process.env.DOCKLIGHT_DB_PATH;
		mockFs.existsSync.mockReturnValue(false);
	});

	afterEach(() => {
		process.env = OLD_ENV;
	});

	it("returns env values when no settings file exists", () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "dokku@envhost";
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = "/env/key";

		const settings = getSettings();

		expect(settings.dokkuSshTarget).toBe("dokku@envhost");
		expect(settings.dokkuSshKeyPath).toBe("/env/key");
	});

	it("returns empty string defaults when no env and no settings file", () => {
		const settings = getSettings();

		expect(settings.dokkuSshTarget).toBe("");
		expect(settings.dokkuSshKeyPath).toBe("");
	});

	it("prefers file settings over env values", () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "dokku@envhost";
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = "/env/key";

		mockFs.existsSync.mockReturnValue(true);
		mockFs.readFileSync.mockReturnValue(
			JSON.stringify({
				dokkuSshTarget: "dokku@filehost",
				dokkuSshKeyPath: "/file/key",
			})
		);

		const settings = getSettings();

		expect(settings.dokkuSshTarget).toBe("dokku@filehost");
		expect(settings.dokkuSshKeyPath).toBe("/file/key");
	});

	it("falls back to env for empty file values", () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "dokku@envhost";

		mockFs.existsSync.mockReturnValue(true);
		mockFs.readFileSync.mockReturnValue(
			JSON.stringify({
				dokkuSshTarget: "",
				dokkuSshKeyPath: "",
			})
		);

		const settings = getSettings();

		expect(settings.dokkuSshTarget).toBe("dokku@envhost");
	});

	it("trims whitespace from file and env values", () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "  dokku@host  ";
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = "  /path/key  ";

		const settings = getSettings();

		expect(settings.dokkuSshTarget).toBe("dokku@host");
		expect(settings.dokkuSshKeyPath).toBe("/path/key");
	});

	it("trims file values", () => {
		mockFs.existsSync.mockReturnValue(true);
		mockFs.readFileSync.mockReturnValue(
			JSON.stringify({
				dokkuSshTarget: "  dokku@filehost  ",
				dokkuSshKeyPath: "  /file/key  ",
			})
		);

		const settings = getSettings();

		expect(settings.dokkuSshTarget).toBe("dokku@filehost");
		expect(settings.dokkuSshKeyPath).toBe("/file/key");
	});
});
