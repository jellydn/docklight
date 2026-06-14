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

describe("getEffectiveDokkuSshConfig", () => {
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

	it("returns env values when no settings file exists", async () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "dokku@envhost";
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = "/env/key";

		const { getEffectiveDokkuSshConfig } = await import("./server-config.js");
		const config = getEffectiveDokkuSshConfig();

		expect(config.target).toBe("dokku@envhost");
		expect(config.keyPath).toBe("/env/key");
	});

	it("returns undefined when no env and no settings file", async () => {
		const { getEffectiveDokkuSshConfig } = await import("./server-config.js");
		const config = getEffectiveDokkuSshConfig();

		expect(config.target).toBeUndefined();
		expect(config.keyPath).toBeUndefined();
	});

	it("prefers file settings over env values", async () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "dokku@envhost";
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = "/env/key";

		mockFs.existsSync.mockReturnValue(true);
		mockFs.readFileSync.mockReturnValue(
			JSON.stringify({
				dokkuSshTarget: "dokku@filehost",
				dokkuSshKeyPath: "/file/key",
			})
		);

		const { getEffectiveDokkuSshConfig } = await import("./server-config.js");
		const config = getEffectiveDokkuSshConfig();

		expect(config.target).toBe("dokku@filehost");
		expect(config.keyPath).toBe("/file/key");
	});

	it("returns undefined for empty string values", async () => {
		mockFs.existsSync.mockReturnValue(true);
		mockFs.readFileSync.mockReturnValue(
			JSON.stringify({
				dokkuSshTarget: "",
				dokkuSshKeyPath: "",
			})
		);

		const { getEffectiveDokkuSshConfig } = await import("./server-config.js");
		const config = getEffectiveDokkuSshConfig();

		expect(config.target).toBeUndefined();
		expect(config.keyPath).toBeUndefined();
	});

	it("trims whitespace from values", async () => {
		process.env.DOCKLIGHT_DOKKU_SSH_TARGET = "  dokku@host  ";
		process.env.DOCKLIGHT_DOKKU_SSH_KEY_PATH = "  /path/key  ";

		const { getEffectiveDokkuSshConfig } = await import("./server-config.js");
		const config = getEffectiveDokkuSshConfig();

		expect(config.target).toBe("dokku@host");
		expect(config.keyPath).toBe("/path/key");
	});
});
