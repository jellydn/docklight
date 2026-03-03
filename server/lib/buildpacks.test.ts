import { beforeEach, describe, expect, it, vi } from "vitest";
import { addBuildpack, clearBuildpacks, getBuildpacks, removeBuildpack } from "./buildpacks.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("getBuildpacks", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await getBuildpacks("INVALID APP!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should parse buildpack list from output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku buildpacks:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app buildpacks information",
				"       1 https://github.com/heroku/heroku-buildpack-nodejs",
				"       2 https://github.com/heroku/heroku-buildpack-ruby",
			].join("\n"),
			stderr: "",
		});

		const result = await getBuildpacks("my-app");

		expect(result).toEqual([
			{ index: 1, url: "https://github.com/heroku/heroku-buildpack-nodejs" },
			{ index: 2, url: "https://github.com/heroku/heroku-buildpack-ruby" },
		]);
	});

	it("should strip ANSI codes from output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku buildpacks:report my-app",
			exitCode: 0,
			stdout: "       1 \u001b[32mhttps://github.com/heroku/heroku-buildpack-nodejs\u001b[0m",
			stderr: "",
		});

		const result = await getBuildpacks("my-app");

		expect(result).toEqual([
			{ index: 1, url: "https://github.com/heroku/heroku-buildpack-nodejs" },
		]);
	});

	it("should return empty array when no buildpacks are configured", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku buildpacks:report my-app",
			exitCode: 0,
			stdout: "=====> my-app buildpacks information",
			stderr: "",
		});

		const result = await getBuildpacks("my-app");

		expect(result).toEqual([]);
	});

	it("should return error when command fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku buildpacks:report my-app",
			exitCode: 1,
			stdout: "",
			stderr: "app not found",
		});

		const result = await getBuildpacks("my-app");

		expect(result).toMatchObject({
			error: "Failed to get buildpacks",
			exitCode: 1,
			stderr: "app not found",
		});
	});
});

describe("addBuildpack", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await addBuildpack(
			"INVALID!",
			"https://github.com/heroku/heroku-buildpack-nodejs"
		);

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when url is empty", async () => {
		const result = await addBuildpack("my-app", "");

		expect(result).toMatchObject({
			error: "Buildpack URL is required",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute add buildpack command without index", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku buildpacks:add 'my-app' 'https://github.com/heroku/heroku-buildpack-nodejs'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await addBuildpack(
			"my-app",
			"https://github.com/heroku/heroku-buildpack-nodejs"
		);

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku buildpacks:add 'my-app' 'https://github.com/heroku/heroku-buildpack-nodejs'"
		);
	});

	it("should execute add buildpack command with index", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command:
				"dokku buildpacks:add 'my-app' --index 2 'https://github.com/heroku/heroku-buildpack-ruby'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await addBuildpack(
			"my-app",
			"https://github.com/heroku/heroku-buildpack-ruby",
			2
		);

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku buildpacks:add 'my-app' --index 2 'https://github.com/heroku/heroku-buildpack-ruby'"
		);
	});

	it("should not include index when index is 0", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku buildpacks:add 'my-app' 'https://github.com/heroku/heroku-buildpack-nodejs'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		await addBuildpack("my-app", "https://github.com/heroku/heroku-buildpack-nodejs", 0);

		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku buildpacks:add 'my-app' 'https://github.com/heroku/heroku-buildpack-nodejs'"
		);
	});
});

describe("removeBuildpack", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await removeBuildpack(
			"INVALID!",
			"https://github.com/heroku/heroku-buildpack-nodejs"
		);

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when url is empty", async () => {
		const result = await removeBuildpack("my-app", "");

		expect(result).toMatchObject({
			error: "Buildpack URL is required",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute remove buildpack command", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command:
				"dokku buildpacks:remove 'my-app' 'https://github.com/heroku/heroku-buildpack-nodejs'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await removeBuildpack(
			"my-app",
			"https://github.com/heroku/heroku-buildpack-nodejs"
		);

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku buildpacks:remove 'my-app' 'https://github.com/heroku/heroku-buildpack-nodejs'"
		);
	});
});

describe("clearBuildpacks", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await clearBuildpacks("INVALID!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute clear buildpacks command", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku buildpacks:clear 'my-app'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await clearBuildpacks("my-app");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku buildpacks:clear 'my-app'");
	});
});
