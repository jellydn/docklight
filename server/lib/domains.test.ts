import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDomain, getDomains, removeDomain } from "./domains.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("getDomains", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await getDomains("INVALID APP!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should parse domains vhosts from output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app domains information",
				"       Domains app enabled: true",
				"       Domains app vhosts: my-app.example.com api.example.com",
				"       Domains global enabled: true",
				"       Domains global vhosts: example.com",
			].join("\n"),
			stderr: "",
		});

		const result = await getDomains("my-app");

		expect(result).toEqual(["my-app.example.com", "api.example.com"]);
	});

	it("should strip ANSI codes from output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:report my-app",
			exitCode: 0,
			stdout:
				"       Domains app enabled: \u001b[32mtrue\u001b[0m\n       Domains app vhosts: \u001b[32mmy-app.example.com\u001b[0m",
			stderr: "",
		});

		const result = await getDomains("my-app");

		expect(result).toEqual(["my-app.example.com"]);
	});

	it("should return empty array when domains app is disabled", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app domains information",
				"       Domains app enabled: false",
				"       Domains app vhosts: my-app.example.com",
				"       Domains global enabled: true",
				"       Domains global vhosts: example.com",
			].join("\n"),
			stderr: "",
		});

		const result = await getDomains("my-app");

		expect(result).toEqual([]);
	});

	it("should return empty array when no domains are set", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app domains information",
				"       Domains app enabled: true",
				"       Domains app vhosts:    -",
			].join("\n"),
			stderr: "",
		});

		const result = await getDomains("my-app");

		expect(result).toEqual([]);
	});

	it("should return error when command fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:report my-app",
			exitCode: 1,
			stdout: "",
			stderr: "app not found",
		});

		const result = await getDomains("my-app");

		expect(result).toMatchObject({
			error: "Failed to get domains",
			exitCode: 1,
			stderr: "app not found",
		});
	});
});

describe("addDomain", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await addDomain("INVALID!", "example.com");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for empty domain", async () => {
		const result = await addDomain("my-app", "");

		expect(result).toMatchObject({
			error: "Domain cannot be empty",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for domain with shell metacharacters", async () => {
		const result = await addDomain("my-app", "evil.com;rm -rf /");

		expect(result).toMatchObject({
			error: "Domain contains invalid characters",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for domain with invalid format", async () => {
		const result = await addDomain("my-app", "not a valid domain");

		expect(result).toMatchObject({
			error: "Invalid domain format",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute add domain command for valid input", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:add 'my-app' 'example.com'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await addDomain("my-app", "example.com");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku domains:add 'my-app' 'example.com'");
	});

	it("should trim whitespace from domain before executing", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:add 'my-app' 'example.com'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		await addDomain("my-app", "  example.com  ");

		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku domains:add 'my-app' 'example.com'");
	});
});

describe("removeDomain", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await removeDomain("INVALID!", "example.com");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for empty domain", async () => {
		const result = await removeDomain("my-app", "");

		expect(result).toMatchObject({
			error: "Domain cannot be empty",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute remove domain command for valid input", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku domains:remove 'my-app' 'example.com'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await removeDomain("my-app", "example.com");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku domains:remove 'my-app' 'example.com'");
	});
});
