import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChecksReport, parseChecksReport, runChecks } from "./checks.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("parseChecksReport", () => {
	it("should parse all checks report fields", () => {
		const stdout = [
			"=====> my-app checks information",
			"       Checks disabled list:          none",
			"       Checks skipped list:           none",
			"       Checks computed disabled:      false",
			"       Checks computed skip all:      false",
			"       Checks computed skipped:       ",
			"       Checks global disabled:        false",
			"       Checks global skip all:        false",
			"       Checks global skipped:         ",
		].join("\n");

		const result = parseChecksReport(stdout);

		expect(result).toEqual({
			disabledList: "none",
			skippedList: "none",
			computedDisabled: false,
			computedSkipAll: false,
			computedSkipped: "",
			globalDisabled: false,
			globalSkipAll: false,
			globalSkipped: "",
		});
	});

	it("should parse disabled and skipped as true", () => {
		const stdout = [
			"=====> my-app checks information",
			"       Checks computed disabled:      true",
			"       Checks computed skip all:      true",
			"       Checks global disabled:        true",
			"       Checks global skip all:        true",
		].join("\n");

		const result = parseChecksReport(stdout);

		expect(result.computedDisabled).toBe(true);
		expect(result.computedSkipAll).toBe(true);
		expect(result.globalDisabled).toBe(true);
		expect(result.globalSkipAll).toBe(true);
	});

	it("should parse process-specific skipped and disabled lists", () => {
		const stdout = [
			"=====> my-app checks information",
			"       Checks disabled list:          web worker",
			"       Checks skipped list:           web",
			"       Checks computed skipped:       web",
			"       Checks global skipped:         worker",
		].join("\n");

		const result = parseChecksReport(stdout);

		expect(result.disabledList).toBe("web worker");
		expect(result.skippedList).toBe("web");
		expect(result.computedSkipped).toBe("web");
		expect(result.globalSkipped).toBe("worker");
	});

	it("should return defaults for empty output", () => {
		const result = parseChecksReport("");

		expect(result).toEqual({
			disabledList: "",
			skippedList: "",
			computedDisabled: false,
			computedSkipAll: false,
			computedSkipped: "",
			globalDisabled: false,
			globalSkipAll: false,
			globalSkipped: "",
		});
	});

	it("should strip ANSI codes from output", () => {
		const stdout = "       Checks disabled list: \u001b[32mnone\u001b[0m";
		const result = parseChecksReport(stdout);

		expect(result.disabledList).toBe("none");
	});
});

describe("getChecksReport", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await getChecksReport("INVALID APP!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return parsed checks report on success", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku checks:report 'my-app'",
			exitCode: 0,
			stdout: [
				"=====> my-app checks information",
				"       Checks disabled list:          none",
				"       Checks skipped list:           none",
				"       Checks computed disabled:      false",
				"       Checks computed skip all:      false",
				"       Checks computed skipped:       ",
				"       Checks global disabled:        false",
				"       Checks global skip all:        false",
				"       Checks global skipped:         ",
			].join("\n"),
			stderr: "",
		});

		const result = await getChecksReport("my-app");

		expect(result).toEqual({
			disabledList: "none",
			skippedList: "none",
			computedDisabled: false,
			computedSkipAll: false,
			computedSkipped: "",
			globalDisabled: false,
			globalSkipAll: false,
			globalSkipped: "",
		});
	});

	it("should return error when checks:report fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku checks:report 'my-app'",
			exitCode: 1,
			stdout: "",
			stderr: "app not found",
		});

		const result = await getChecksReport("my-app");

		expect(result).toMatchObject({
			error: "Failed to get checks report",
			exitCode: 1,
			stderr: "app not found",
		});
	});

	it("should return error when executeCommand throws", async () => {
		const errorMessage = "SSH connection failed";
		mockExecuteCommand.mockRejectedValueOnce(new Error(errorMessage));

		const result = await getChecksReport("my-app");

		expect(result).toMatchObject({
			error: errorMessage,
			exitCode: 1,
			command: "dokku checks:report 'my-app'",
			stderr: errorMessage,
		});
	});

	it("should handle error object without message property", async () => {
		mockExecuteCommand.mockRejectedValueOnce({});

		const result = await getChecksReport("my-app");

		expect(result).toMatchObject({
			error: "Unknown error occurred",
			exitCode: 1,
			command: "dokku checks:report 'my-app'",
		});
	});

	it("should handle empty string app name", async () => {
		const result = await getChecksReport("");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should handle app name with uppercase letters", async () => {
		const result = await getChecksReport("MyApp");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should parse boolean true values case-insensitively", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku checks:report 'my-app'",
			exitCode: 0,
			stdout: [
				"       Checks computed disabled:      TRUE",
				"       Checks computed skip all:      True",
			].join("\n"),
			stderr: "",
		});

		const result = await getChecksReport("my-app");

		expect(result).toMatchObject({
			computedDisabled: true,
			computedSkipAll: true,
		});
	});

	it("should strip ANSI codes from command output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku checks:report 'my-app'",
			exitCode: 0,
			stdout: "       Checks disabled list: \u001b[32mnone\u001b[0m",
			stderr: "",
		});

		const result = await getChecksReport("my-app");

		expect((result as { disabledList: string }).disabledList).toBe("none");
	});
});

describe("runChecks", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await runChecks("INVALID!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute checks:run for valid app", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku checks:run 'my-app'",
			exitCode: 0,
			stdout: "Running checks for my-app...",
			stderr: "",
		});

		const result = await runChecks("my-app");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku checks:run 'my-app'", 120000);
	});

	it("should return command result with non-zero exit code when checks fail", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku checks:run 'my-app'",
			exitCode: 1,
			stdout: "",
			stderr: "Health check failed",
		});

		const result = await runChecks("my-app");

		expect(result).toMatchObject({
			exitCode: 1,
			stderr: "Health check failed",
		});
	});

	it("should return error result when executeCommand throws", async () => {
		const errorMessage = "SSH connection failed";
		mockExecuteCommand.mockRejectedValueOnce(new Error(errorMessage));

		const result = await runChecks("my-app");

		expect(result).toMatchObject({
			error: errorMessage,
			exitCode: 1,
			command: "dokku checks:run 'my-app'",
		});
	});

	it("should handle empty string app name", async () => {
		const result = await runChecks("");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should handle app name with underscore", async () => {
		const result = await runChecks("my_app");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should handle app name with spaces", async () => {
		const result = await runChecks("my app");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});
