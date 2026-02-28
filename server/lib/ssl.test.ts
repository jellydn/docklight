import { beforeEach, describe, expect, it, vi } from "vitest";
import { enableSSL, getSSL } from "./ssl.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("getSSL", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should parse active letsencrypt status from letsencrypt:report", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku letsencrypt:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app letsencrypt information",
				"       Letsencrypt enabled:          true",
				"       Letsencrypt certificate not after: 2026-05-10",
			].join("\n"),
			stderr: "",
		});

		const result = await getSSL("my-app");

		expect(result).toEqual({
			active: true,
			certProvider: "letsencrypt",
			expiryDate: "2026-05-10",
		});
	});

	it("should parse ansi-colored boolean values in letsencrypt:report", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku letsencrypt:report my-app",
			exitCode: 0,
			stdout: "Letsencrypt enabled: \u001b[32mtrue\u001b[0m",
			stderr: "",
		});

		const result = await getSSL("my-app");

		expect(result).toEqual({
			active: true,
			certProvider: "letsencrypt",
			expiryDate: undefined,
		});
	});

	it("should fall back to certs:report when letsencrypt report/list do not provide status", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku letsencrypt:report my-app",
				exitCode: 1,
				stdout: "",
				stderr: "not installed",
			})
			.mockResolvedValueOnce({
				command: "dokku letsencrypt:ls",
				exitCode: 1,
				stdout: "",
				stderr: "not installed",
			})
			.mockResolvedValueOnce({
				command: "dokku certs:report my-app",
				exitCode: 0,
				stdout: [
					"=====> my-app ssl information",
					"       Ssl enabled: true",
					"       Ssl expires at: 2026-12-31",
				].join("\n"),
				stderr: "",
			});

		const result = await getSSL("my-app");

		expect(result).toEqual({
			active: true,
			certProvider: "custom",
			expiryDate: "2026-12-31",
		});
	});
});

describe("enableSSL", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should set email before enabling SSL when email is provided", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku letsencrypt:set my-app email ops@example.com",
				exitCode: 0,
				stdout: "",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku letsencrypt:enable my-app",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

		const result = await enableSSL("my-app", "ops@example.com");

		expect(result.exitCode).toBe(0);
		expect(mockExecuteCommand).toHaveBeenNthCalledWith(
			1,
			"dokku letsencrypt:set 'my-app' email 'ops@example.com'"
		);
		expect(mockExecuteCommand).toHaveBeenNthCalledWith(2, "dokku letsencrypt:enable my-app");
	});

	it("should return validation error for invalid email", async () => {
		const result = await enableSSL("my-app", "not-an-email");

		expect(result).toMatchObject({
			error: "Invalid email address",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});
