import { beforeEach, describe, expect, it, vi } from "vitest";
import { installPlugin } from "./plugins.js";
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
