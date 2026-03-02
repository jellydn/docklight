import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearNetworkProperty, getNetworkReport, setNetworkProperty } from "./network.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("getNetworkReport", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await getNetworkReport("INVALID APP!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should parse network report properties from output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku network:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app network information",
				"       attach-post-create:    my-network",
				"       attach-post-deploy:    ",
				"       bind-all-interfaces:   false",
				"       initial-network:       bridge",
				"       static-web-listener:   ",
				"       tls-internal:          false",
			].join("\n"),
			stderr: "",
		});

		const result = await getNetworkReport("my-app");

		expect(result).toEqual({
			"attach-post-create": "my-network",
			"attach-post-deploy": "",
			"bind-all-interfaces": "false",
			"initial-network": "bridge",
			"static-web-listener": "",
			"tls-internal": "false",
		});
	});

	it("should strip ANSI codes from output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku network:report my-app",
			exitCode: 0,
			stdout:
				"       attach-post-create: \u001b[32mmy-network\u001b[0m\n       attach-post-deploy: \n       bind-all-interfaces: false\n       initial-network: bridge\n       static-web-listener: \n       tls-internal: false",
			stderr: "",
		});

		const result = await getNetworkReport("my-app");

		expect(result).toMatchObject({ "attach-post-create": "my-network" });
	});

	it("should return defaults when no properties match", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku network:report my-app",
			exitCode: 0,
			stdout: "=====> my-app network information",
			stderr: "",
		});

		const result = await getNetworkReport("my-app");

		expect(result).toEqual({
			"attach-post-create": "",
			"attach-post-deploy": "",
			"bind-all-interfaces": "",
			"initial-network": "",
			"static-web-listener": "",
			"tls-internal": "",
		});
	});

	it("should return error when command fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku network:report my-app",
			exitCode: 1,
			stdout: "",
			stderr: "app not found",
		});

		const result = await getNetworkReport("my-app");

		expect(result).toMatchObject({
			error: "Failed to get network report",
			exitCode: 1,
			stderr: "app not found",
		});
	});
});

describe("setNetworkProperty", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await setNetworkProperty("INVALID!", "initial-network", "my-network");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for invalid network property", async () => {
		const result = await setNetworkProperty("my-app", "invalid-property", "value");

		expect(result).toMatchObject({
			error: expect.stringContaining("Invalid network property"),
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute set network property command", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku network:set 'my-app' 'initial-network' 'my-network'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await setNetworkProperty("my-app", "initial-network", "my-network");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku network:set 'my-app' 'initial-network' 'my-network'"
		);
	});

	it("should accept all valid network properties", async () => {
		const validProperties = [
			"attach-post-create",
			"attach-post-deploy",
			"bind-all-interfaces",
			"initial-network",
			"static-web-listener",
			"tls-internal",
		];

		for (const prop of validProperties) {
			mockExecuteCommand.mockResolvedValueOnce({
				command: `dokku network:set 'my-app' '${prop}' 'value'`,
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await setNetworkProperty("my-app", prop, "value");
			expect(result).toMatchObject({ exitCode: 0 });
		}

		expect(mockExecuteCommand).toHaveBeenCalledTimes(validProperties.length);
	});
});

describe("clearNetworkProperty", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await clearNetworkProperty("INVALID!", "initial-network");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for invalid network property", async () => {
		const result = await clearNetworkProperty("my-app", "invalid-property");

		expect(result).toMatchObject({
			error: expect.stringContaining("Invalid network property"),
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute clear network property command (no value)", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku network:set 'my-app' 'initial-network'",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await clearNetworkProperty("my-app", "initial-network");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku network:set 'my-app' 'initial-network'"
		);
	});
});
