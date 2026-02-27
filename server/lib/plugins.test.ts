import { beforeEach, describe, expect, it, vi } from "vitest";
import { disablePlugin, enablePlugin, getPlugins, installPlugin, uninstallPlugin } from "./plugins.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("installPlugin", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("installs plugin from full repository URL", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku plugin:install https://github.com/dokku/dokku-postgres.git",
			exitCode: 0,
			stdout: "installed",
			stderr: "",
		});

		const result = await installPlugin("https://github.com/dokku/dokku-postgres.git");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku plugin:install https://github.com/dokku/dokku-postgres.git"
		);
	});

	it("supports owner/repo shorthand and optional plugin name", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku plugin:install https://github.com/acme/custom-plugin.git custom-plugin",
			exitCode: 0,
			stdout: "installed",
			stderr: "",
		});

		await installPlugin("acme/custom-plugin", "custom-plugin");

		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku plugin:install https://github.com/acme/custom-plugin.git custom-plugin"
		);
	});

	it("rejects unsafe repository input", async () => {
		const result = await installPlugin("https://github.com/dokku/dokku-postgres.git; rm -rf /");

		expect(result).toEqual({
			error: "Plugin repository contains invalid characters",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});

describe("getPlugins", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("parses plugin list output", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku plugin:list",
			exitCode: 0,
			stdout: [
				"Name                 Enabled    Version",
				"dokku-postgres       true       1.31.0",
				"dokku-redis          false      1.30.0",
			].join("\n"),
			stderr: "",
		});

		const result = await getPlugins();
		expect(result).toEqual([
			{ name: "dokku-postgres", enabled: true, version: "1.31.0" },
			{ name: "dokku-redis", enabled: false, version: "1.30.0" },
		]);
	});
});

describe("plugin state operations", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("enables plugin by name", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku plugin:enable dokku-postgres",
			exitCode: 0,
			stdout: "enabled",
			stderr: "",
		});

		await enablePlugin("dokku-postgres");
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku plugin:enable dokku-postgres");
	});

	it("disables plugin by name", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku plugin:disable dokku-postgres",
			exitCode: 0,
			stdout: "disabled",
			stderr: "",
		});

		await disablePlugin("dokku-postgres");
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku plugin:disable dokku-postgres");
	});

	it("uninstalls plugin by name", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku plugin:uninstall dokku-postgres",
			exitCode: 0,
			stdout: "removed",
			stderr: "",
		});

		await uninstallPlugin("dokku-postgres");
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku plugin:uninstall dokku-postgres");
	});

	it("rejects invalid plugin names", async () => {
		const result = await enablePlugin("dokku-postgres;rm");
		expect(result).toEqual({
			error: "Plugin name contains invalid characters",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});
