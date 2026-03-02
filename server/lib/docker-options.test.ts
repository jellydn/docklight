import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandResult } from "./executor.js";
import {
	getDockerOptions,
	addDockerOption,
	removeDockerOption,
	clearDockerOptions,
	type DockerOptions,
} from "./docker-options.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("getDockerOptions", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await getDockerOptions("MyApp");

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when command fails", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku docker-options:report my-app",
			exitCode: 1,
			stdout: "",
			stderr: "App not found",
		});

		const result = await getDockerOptions("my-app");

		expect(result).toEqual({
			error: "Failed to get docker options",
			command: "dokku docker-options:report my-app",
			exitCode: 1,
			stderr: "App not found",
		});
	});

	it("should parse docker options from report output", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku docker-options:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app docker options information",
				"Docker options build:  --build-arg FOO=bar",
				"Docker options deploy: --restart=always",
				"Docker options run:    --memory=512m --cpus=0.5",
			].join("\n"),
			stderr: "",
		});

		const result = await getDockerOptions("my-app");

		const options = result as DockerOptions;
		expect(options.build).toEqual(["--build-arg", "FOO=bar"]);
		expect(options.deploy).toEqual(["--restart=always"]);
		expect(options.run).toEqual(["--memory=512m", "--cpus=0.5"]);
	});

	it("should return empty arrays when no options are set", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku docker-options:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app docker options information",
				"Docker options build:  ",
				"Docker options deploy: ",
				"Docker options run:    ",
			].join("\n"),
			stderr: "",
		});

		const result = await getDockerOptions("my-app");

		const options = result as DockerOptions;
		expect(options.build).toEqual([]);
		expect(options.deploy).toEqual([]);
		expect(options.run).toEqual([]);
	});

	it("should handle ANSI escape codes in output", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku docker-options:report my-app",
			exitCode: 0,
			stdout: "Docker options run: \u001b[32m--privileged\u001b[0m",
			stderr: "",
		});

		const result = await getDockerOptions("my-app");

		const options = result as DockerOptions;
		expect(options.run).toEqual(["--privileged"]);
	});

	it("should return error object on unexpected exception", async () => {
		const errorMessage = "Network error";
		mockExecuteCommand.mockRejectedValue(new Error(errorMessage));

		const result = await getDockerOptions("my-app");

		expect(result).toMatchObject({
			error: errorMessage,
			exitCode: 1,
		});
	});
});

describe("addDockerOption", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await addDockerOption("MyApp", "run", "--privileged");

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid phase", async () => {
		const result = await addDockerOption("my-app", "invalid-phase", "--privileged");

		expect(result).toEqual({
			error: "Phase must be one of: build, deploy, run",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error when option is empty", async () => {
		const result = await addDockerOption("my-app", "run", "");

		expect(result).toEqual({
			error: "Docker option is required",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute add command for build phase", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:add 'my-app' 'build' '--build-arg FOO=bar'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await addDockerOption("my-app", "build", "--build-arg FOO=bar");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should execute add command for deploy phase", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:add 'my-app' 'deploy' '--restart=always'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await addDockerOption("my-app", "deploy", "--restart=always");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should execute add command for run phase with dangerous option", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:add 'my-app' 'run' '--privileged'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await addDockerOption("my-app", "run", "--privileged");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should execute add command for run phase with network=host option", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:add 'my-app' 'run' '--network=host'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await addDockerOption("my-app", "run", "--network=host");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should accept phase with different casing", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:add 'my-app' 'RUN' '--memory=512m'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await addDockerOption("my-app", "RUN", "--memory=512m");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});
});

describe("removeDockerOption", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await removeDockerOption("MyApp", "run", "--privileged");

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid phase", async () => {
		const result = await removeDockerOption("my-app", "staging", "--privileged");

		expect(result).toEqual({
			error: "Phase must be one of: build, deploy, run",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error when option is empty", async () => {
		const result = await removeDockerOption("my-app", "run", "");

		expect(result).toEqual({
			error: "Docker option is required",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute remove command successfully", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:remove 'my-app' 'run' '--privileged'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await removeDockerOption("my-app", "run", "--privileged");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should return error when remove command fails", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku docker-options:remove 'my-app' 'run' '--privileged'",
			exitCode: 1,
			stdout: "",
			stderr: "Option not found",
		});

		const result = await removeDockerOption("my-app", "run", "--privileged");

		expect(result).toMatchObject({
			exitCode: 1,
		});
	});
});

describe("clearDockerOptions", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await clearDockerOptions("MyApp", "run");

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid phase", async () => {
		const result = await clearDockerOptions("my-app", "test");

		expect(result).toEqual({
			error: "Phase must be one of: build, deploy, run",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute clear command for build phase", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:clear 'my-app' 'build'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await clearDockerOptions("my-app", "build");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should execute clear command for deploy phase", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:clear 'my-app' 'deploy'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await clearDockerOptions("my-app", "deploy");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should execute clear command for run phase", async () => {
		const expectedResult: CommandResult = {
			command: "dokku docker-options:clear 'my-app' 'run'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await clearDockerOptions("my-app", "run");

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should return error when clear command fails", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku docker-options:clear 'my-app' 'run'",
			exitCode: 1,
			stdout: "",
			stderr: "App not found",
		});

		const result = await clearDockerOptions("my-app", "run");

		expect(result).toMatchObject({
			exitCode: 1,
		});
	});
});
