import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearBuildDir,
	getDeploymentSettings,
	setBuildDir,
	setBuilder,
	setDeployBranch,
} from "./deployment.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("getDeploymentSettings", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await getDeploymentSettings("INVALID APP!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should parse deploy branch and builder settings", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku git:report my-app",
				exitCode: 0,
				stdout: [
					"=====> my-app git information",
					"       Git deploy branch:           main",
					"       Git global deploy branch:    master",
				].join("\n"),
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku builder:report my-app",
				exitCode: 0,
				stdout: [
					"=====> my-app builder information",
					"       Builder build directory:     /app/subdir",
					"       Builder selected:            herokuish",
				].join("\n"),
				stderr: "",
			});

		const result = await getDeploymentSettings("my-app");

		expect(result).toEqual({
			deployBranch: "main",
			buildDir: "/app/subdir",
			builder: "herokuish",
		});
	});

	it("should strip ANSI codes from output", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku git:report my-app",
				exitCode: 0,
				stdout: "       Git deploy branch: \u001b[32mmain\u001b[0m",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku builder:report my-app",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

		const result = await getDeploymentSettings("my-app");

		expect(result).toMatchObject({ deployBranch: "main" });
	});

	it("should return error when git:report fails", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku git:report my-app",
				exitCode: 1,
				stdout: "",
				stderr: "app not found",
			})
			.mockResolvedValueOnce({
				command: "dokku builder:report my-app",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

		const result = await getDeploymentSettings("my-app");

		expect(result).toMatchObject({
			error: "Failed to get deployment settings",
			exitCode: 1,
			stderr: "app not found",
		});
	});

	it("should still return settings when builder:report fails", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku git:report my-app",
				exitCode: 0,
				stdout: "       Git deploy branch: main",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku builder:report my-app",
				exitCode: 1,
				stdout: "",
				stderr: "not available",
			});

		const result = await getDeploymentSettings("my-app");

		expect(result).toEqual({
			deployBranch: "main",
			buildDir: "",
			builder: "",
		});
	});
});

describe("setDeployBranch", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await setDeployBranch("INVALID!", "main");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when branch is empty", async () => {
		const result = await setDeployBranch("my-app", "");

		expect(result).toMatchObject({
			error: "Deploy branch is required",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute set deploy branch command", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku git:set 'my-app' deploy-branch 'main'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await setDeployBranch("my-app", "main");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku git:set 'my-app' deploy-branch 'main'");
	});
});

describe("setBuildDir", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await setBuildDir("INVALID!", "/app");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute set build dir command for non-empty dir", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku builder:set 'my-app' build-dir '/app/subdir'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await setBuildDir("my-app", "/app/subdir");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku builder:set 'my-app' build-dir '/app/subdir'"
		);
	});

	it("should execute clear build dir command when dir is empty string", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku builder:set 'my-app' build-dir",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await setBuildDir("my-app", "");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku builder:set 'my-app' build-dir");
	});
});

describe("clearBuildDir", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await clearBuildDir("INVALID!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute clear build dir command", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku builder:set 'my-app' build-dir",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await clearBuildDir("my-app");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku builder:set 'my-app' build-dir");
	});
});

describe("setBuilder", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await setBuilder("INVALID!", "herokuish");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for invalid builder", async () => {
		const result = await setBuilder("my-app", "invalid-builder");

		expect(result).toMatchObject({
			error: expect.stringContaining("Invalid builder"),
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute set builder command for valid builder", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku builder:set 'my-app' selected 'herokuish'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await setBuilder("my-app", "herokuish");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku builder:set 'my-app' selected 'herokuish'"
		);
	});

	it("should execute clear selected builder command when builder is empty", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku builder:set 'my-app' selected",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await setBuilder("my-app", "");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku builder:set 'my-app' selected");
	});

	it("should accept all valid builder values", async () => {
		for (const builder of ["herokuish", "dockerfile", "pack"]) {
			mockExecuteCommand.mockResolvedValueOnce({
				command: `dokku builder:set 'my-app' selected '${builder}'`,
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await setBuilder("my-app", builder);
			expect(result).toMatchObject({ exitCode: 0 });
		}

		expect(mockExecuteCommand).toHaveBeenCalledTimes(3);
	});
});
