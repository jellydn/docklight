import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase, getDatabases } from "./databases.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("databases", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getDatabases should only query installed plugins", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku plugin:list",
				exitCode: 0,
				stdout: [
					"00_dokku-standard",
					"dokku-postgres",
					"dokku-redis",
					"dokku-builder-dockerfile",
				].join("\n"),
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku postgres:list",
				exitCode: 0,
				stdout: "main-db",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku redis:list",
				exitCode: 0,
				stdout: "",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku postgres:links main-db",
				exitCode: 0,
				stdout: "postgres service main-db linked apps: api, worker",
				stderr: "",
			});

		const result = await getDatabases();

		expect(result).toEqual([
			{
				name: "main-db",
				plugin: "postgres",
				linkedApps: ["api", "worker"],
				connectionInfo: "postgresql://main-db@localhost",
			},
		]);
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku plugin:list");
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku postgres:list");
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku redis:list");
		expect(mockExecuteCommand).not.toHaveBeenCalledWith("dokku mysql:list");
	});

	it("createDatabase should return clear error when plugin is not installed", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku plugin:list",
			exitCode: 0,
			stdout: "00_dokku-standard\ndokku-redis",
			stderr: "",
		});

		const result = await createDatabase("postgres", "appdb");

		expect(result).toMatchObject({
			error: "Database plugin 'postgres' is not installed",
			command: "dokku plugin:list",
			exitCode: 400,
		});
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("createDatabase should return plugin-list error when plugin check fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku plugin:list",
			exitCode: 1,
			stdout: "",
			stderr: "permission denied",
		});

		const result = await createDatabase("postgres", "appdb");

		expect(result).toEqual({
			error: "Failed to verify installed plugins before creating database",
			command: "dokku plugin:list",
			exitCode: 1,
			stderr: "permission denied",
		});
	});
});
