import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	addPort,
	clearPorts,
	disableProxy,
	enableProxy,
	getPorts,
	getProxyReport,
	removePort,
} from "./ports.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("getPorts", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await getPorts("INVALID_APP");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when command fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:report my-app",
			exitCode: 1,
			stdout: "",
			stderr: "App not found",
		});

		const result = await getPorts("my-app");

		expect(result).toMatchObject({
			error: "Failed to get ports",
			exitCode: 1,
			stderr: "App not found",
		});
	});

	it("should parse port mappings from ports:report output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app ports information",
				"       Ports map:             http:80:5000 https:443:5000",
			].join("\n"),
			stderr: "",
		});

		const result = await getPorts("my-app");

		expect(result).toEqual([
			{ scheme: "http", hostPort: 80, containerPort: 5000 },
			{ scheme: "https", hostPort: 443, containerPort: 5000 },
		]);
	});

	it("should parse tcp scheme in port mappings", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:report my-app",
			exitCode: 0,
			stdout: "       Ports map:             tcp:2222:22",
			stderr: "",
		});

		const result = await getPorts("my-app");

		expect(result).toEqual([{ scheme: "tcp", hostPort: 2222, containerPort: 22 }]);
	});

	it("should return empty array when no port mappings are present", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:report my-app",
			exitCode: 0,
			stdout: "=====> my-app ports information",
			stderr: "",
		});

		const result = await getPorts("my-app");

		expect(result).toEqual([]);
	});

	it("should strip ansi codes from port output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:report my-app",
			exitCode: 0,
			stdout: "       Ports map:             \u001b[32mhttp:80:5000\u001b[0m",
			stderr: "",
		});

		const result = await getPorts("my-app");

		expect(result).toEqual([{ scheme: "http", hostPort: 80, containerPort: 5000 }]);
	});

	it("should return error when executeCommand throws", async () => {
		mockExecuteCommand.mockRejectedValueOnce(new Error("Connection refused"));

		const result = await getPorts("my-app");

		expect(result).toMatchObject({
			error: "Connection refused",
			exitCode: 1,
		});
	});
});

describe("addPort", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await addPort("INVALID_APP", "http", 80, 5000);

		expect(result).toMatchObject({ error: "Invalid app name", exitCode: 400 });
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid scheme", async () => {
		const result = await addPort("my-app", "ftp", 80, 5000);

		expect(result).toMatchObject({
			error: "Scheme must be http, https, or tcp",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error when hostPort is 0", async () => {
		const result = await addPort("my-app", "http", 0, 5000);

		expect(result).toMatchObject({
			error: "Port must be a number between 1 and 65535",
			exitCode: 400,
		});
	});

	it("should return validation error when hostPort is 65536", async () => {
		const result = await addPort("my-app", "http", 65536, 5000);

		expect(result).toMatchObject({
			error: "Port must be a number between 1 and 65535",
			exitCode: 400,
		});
	});

	it("should accept hostPort boundary values 1 and 65535", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku ports:add my-app http:1:5000",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const resultMin = await addPort("my-app", "http", 1, 5000);
		expect(resultMin).toMatchObject({ exitCode: 0 });

		const resultMax = await addPort("my-app", "http", 65535, 5000);
		expect(resultMax).toMatchObject({ exitCode: 0 });
	});

	it("should return validation error when containerPort is invalid", async () => {
		const result = await addPort("my-app", "http", 80, 0);

		expect(result).toMatchObject({
			error: "Port must be a number between 1 and 65535",
			exitCode: 400,
		});
	});

	it("should execute command for valid inputs", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:add my-app http:80:5000",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await addPort("my-app", "http", 80, 5000);

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledOnce();
	});

	it("should accept https and tcp schemes", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku ports:add my-app https:443:5000",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		await expect(addPort("my-app", "https", 443, 5000)).resolves.toMatchObject({ exitCode: 0 });
		await expect(addPort("my-app", "tcp", 2222, 22)).resolves.toMatchObject({ exitCode: 0 });
	});
});

describe("removePort", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await removePort("INVALID_APP", "http", 80, 5000);

		expect(result).toMatchObject({ error: "Invalid app name", exitCode: 400 });
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid scheme", async () => {
		const result = await removePort("my-app", "udp", 80, 5000);

		expect(result).toMatchObject({
			error: "Scheme must be http, https, or tcp",
			exitCode: 400,
		});
	});

	it("should return validation error when hostPort is out of range", async () => {
		const result = await removePort("my-app", "http", 65536, 5000);

		expect(result).toMatchObject({
			error: "Port must be a number between 1 and 65535",
			exitCode: 400,
		});
	});

	it("should return validation error when containerPort is out of range", async () => {
		const result = await removePort("my-app", "http", 80, 65536);

		expect(result).toMatchObject({
			error: "Port must be a number between 1 and 65535",
			exitCode: 400,
		});
	});

	it("should execute command for valid inputs", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:remove my-app http:80:5000",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await removePort("my-app", "http", 80, 5000);

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledOnce();
	});
});

describe("clearPorts", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await clearPorts("INVALID_APP");

		expect(result).toMatchObject({ error: "Invalid app name", exitCode: 400 });
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute ports:clear for valid app", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku ports:clear my-app",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await clearPorts("my-app");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku ports:clear my-app");
	});

});

describe("getProxyReport", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await getProxyReport("INVALID_APP");

		expect(result).toMatchObject({ error: "Invalid app name", exitCode: 400 });
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when command fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku proxy:report my-app",
			exitCode: 1,
			stdout: "",
			stderr: "App not found",
		});

		const result = await getProxyReport("my-app");

		expect(result).toMatchObject({
			error: "Failed to get proxy report",
			exitCode: 1,
			stderr: "App not found",
		});
	});

	it("should parse proxy enabled and type from report output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku proxy:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app proxy information",
				"       Proxy enabled:          true",
				"       Proxy computed type:     nginx",
			].join("\n"),
			stderr: "",
		});

		const result = await getProxyReport("my-app");

		expect(result).toEqual({ enabled: true, type: "nginx" });
	});

	it("should parse proxy disabled state", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku proxy:report my-app",
			exitCode: 0,
			stdout: [
				"       Proxy enabled:          false",
				"       Proxy computed type:     nginx",
			].join("\n"),
			stderr: "",
		});

		const result = await getProxyReport("my-app");

		expect(result).toEqual({ enabled: false, type: "nginx" });
	});

	it("should strip ansi codes from proxy report output", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku proxy:report my-app",
			exitCode: 0,
			stdout: "       Proxy enabled: \u001b[32mtrue\u001b[0m\n       Proxy computed type: nginx",
			stderr: "",
		});

		const result = await getProxyReport("my-app");

		expect(result).toMatchObject({ enabled: true });
	});

	it("should return unknown type when computed type line is absent", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku proxy:report my-app",
			exitCode: 0,
			stdout: "       Proxy enabled:          true",
			stderr: "",
		});

		const result = await getProxyReport("my-app");

		expect(result).toEqual({ enabled: true, type: "unknown" });
	});

	it("should return error when executeCommand throws", async () => {
		mockExecuteCommand.mockRejectedValueOnce(new Error("SSH timeout"));

		const result = await getProxyReport("my-app");

		expect(result).toMatchObject({ error: "SSH timeout", exitCode: 1 });
	});
});

describe("enableProxy", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await enableProxy("INVALID_APP");

		expect(result).toMatchObject({ error: "Invalid app name", exitCode: 400 });
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute proxy:enable for valid app", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku proxy:enable my-app",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await enableProxy("my-app");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku proxy:enable my-app");
	});
});

describe("disableProxy", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return validation error for invalid app name", async () => {
		const result = await disableProxy("INVALID_APP");

		expect(result).toMatchObject({ error: "Invalid app name", exitCode: 400 });
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute proxy:disable for valid app", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku proxy:disable my-app",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await disableProxy("my-app");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku proxy:disable my-app");
	});
});
