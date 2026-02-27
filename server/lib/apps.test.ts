import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommandResult } from "./executor.js";
import {
	getApps,
	getAppDetail,
	isValidAppName,
	restartApp,
	rebuildApp,
	scaleApp,
	type App,
	type AppDetail,
} from "./apps.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("isValidAppName", () => {
	it("should accept valid app names with lowercase letters, numbers, and hyphens", () => {
		const validNames = ["my-app", "app123", "test-app-v1", "a", "123-456"];

		validNames.forEach((name) => {
			expect(isValidAppName(name)).toBe(true);
		});
	});

	it("should reject invalid app names", () => {
		const invalidNames = [
			"MyApp",
			"my_app",
			"my.app",
			"my app",
			"my$app",
			"",
		];

		invalidNames.forEach((name) => {
			expect(isValidAppName(name)).toBe(false);
		});
	});
});

describe("getApps", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return empty array when no apps exist", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku --quiet apps:list",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const result = await getApps();

		expect(result).toEqual([]);
		expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
	});

	it("should return array of apps with status, domains, and deploy time", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku --quiet apps:list",
				exitCode: 0,
				stdout: "my-app\nanother-app",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku ps:report my-app",
				exitCode: 0,
				stdout: "Myapp deployed state: running\nMyapp deployed at: 2024-01-15 10:30:00",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report my-app",
				exitCode: 0,
				stdout: "Myapp domains vhosts: my-app.example.com www.example.com",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku ps:report another-app",
				exitCode: 0,
				stdout: "Anotherapp deployed state: running",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report another-app",
				exitCode: 0,
				stdout: "Anotherapp domains vhosts:",
				stderr: "",
			});

		const result = await getApps();

		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(2);

		const [firstApp, secondApp] = result as App[];
		expect(firstApp.name).toBe("my-app");
		expect(firstApp.status).toBe("running");
		expect(firstApp.domains).toEqual(["my-app.example.com", "www.example.com"]);
		expect(firstApp.lastDeployTime).toBe("2024-01-15 10:30:00");

		expect(secondApp.name).toBe("another-app");
		expect(secondApp.status).toBe("running");
		expect(secondApp.domains).toEqual([]);
	});

	it("should mark app as stopped when not deployed", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku --quiet apps:list",
				exitCode: 0,
				stdout: "stopped-app",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku ps:report stopped-app",
				exitCode: 0,
				stdout: "Stoppedapp deployed state: stopped",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report stopped-app",
				exitCode: 0,
				stdout: "Stoppedapp domains vhosts:",
				stderr: "",
			});

		const result = await getApps();

		const [app] = result as App[];
		expect(app.status).toBe("stopped");
	});

	it("should parse boolean running status from ps report", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku --quiet apps:list",
				exitCode: 0,
				stdout: "my-app",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku ps:report my-app",
				exitCode: 0,
				stdout: "Myapp running: true",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report my-app",
				exitCode: 0,
				stdout: "Myapp domains vhosts:",
				stderr: "",
			});

		const result = await getApps();

		const [app] = result as App[];
		expect(app.status).toBe("running");
	});

	it("should return error when apps list command fails", async () => {
		const stderr = "Permission denied";
		mockExecuteCommand.mockResolvedValue({
			command: "dokku --quiet apps:list",
			exitCode: 1,
			stdout: "",
			stderr,
		});

		const result = await getApps();

		expect(result).toEqual({
			error: "Failed to list apps",
			command: "dokku --quiet apps:list",
			exitCode: 1,
			stderr,
		});
	});

	it("should filter out invalid app names from list", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku --quiet apps:list",
			exitCode: 0,
			stdout: "valid-app\nInvalid_App\nanother-valid",
			stderr: "",
		});

		const result = await getApps();

		const apps = result as App[];
		expect(apps).toHaveLength(2);
		expect(apps.map((a) => a.name)).toEqual(["valid-app", "another-valid"]);
	});

	it("should handle ANSI escape codes in output", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku --quiet apps:list",
			exitCode: 0,
			stdout: "\x1b[0mmy-app\x1b[0m\n  another-app  ",
			stderr: "",
		});

		const result = await getApps();

		const apps = result as App[];
		expect(apps).toHaveLength(2);
		expect(apps[0].name).toBe("my-app");
		expect(apps[1].name).toBe("another-app");
	});

	it("should return error object on unexpected exception", async () => {
		const errorMessage = "Network error";
		mockExecuteCommand.mockRejectedValue(new Error(errorMessage));

		const result = await getApps();

		expect(result).toEqual({
			error: errorMessage,
			command: "dokku apps:list",
			exitCode: 1,
			stderr: errorMessage,
		});
	});
});

describe("getAppDetail", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return detailed app information", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku ps:report my-app",
				exitCode: 0,
				stdout: [
					"Myapp deployed state: running",
					"Myapp app deployed: dokku@my-app.dokku.app:my-app/app.git",
					"Myapp process type scale: web=2 worker=1",
				].join("\n"),
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report my-app",
				exitCode: 0,
				stdout: "Myapp domains vhosts: my-app.example.com",
				stderr: "",
			});

		const result = await getAppDetail("my-app");

		expect(result).toEqual({
			name: "my-app",
			status: "running",
			gitRemote: "Myapp app deployed: dokku@my-app.dokku.app:my-app/app.git",
			domains: ["my-app.example.com"],
			processes: { web: 2, worker: 1 },
		});
	});

	it("should return validation error for invalid app name", async () => {
		const result = await getAppDetail("MyApp");

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
			stderr: "App name must contain only lowercase letters, numbers, and hyphens",
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when ps report command fails", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku ps:report nonexistent-app",
			exitCode: 1,
			stdout: "",
			stderr: "App not found",
		});

		const result = await getAppDetail("nonexistent-app");

		expect(result).toEqual({
			error: "Failed to get app details",
			command: "dokku ps:report nonexistent-app",
			exitCode: 1,
			stderr: "App not found",
		});
	});

	it("should parse stopped app status correctly", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku ps:report stopped-app",
				exitCode: 0,
				stdout: "Myapp deployed state: stopped",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report stopped-app",
				exitCode: 0,
				stdout: "Myapp domains vhosts:",
				stderr: "",
			});

		const result = await getAppDetail("stopped-app");

		const app = result as AppDetail;
		expect(app.status).toBe("stopped");
	});

	it("should parse boolean stopped status from ps report", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku ps:report stopped-app",
				exitCode: 0,
				stdout: "Stoppedapp running: false",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report stopped-app",
				exitCode: 0,
				stdout: "Stoppedapp domains vhosts:",
				stderr: "",
			});

		const result = await getAppDetail("stopped-app");

		const app = result as AppDetail;
		expect(app.status).toBe("stopped");
	});

	it("should parse empty domains list", async () => {
		mockExecuteCommand
			.mockResolvedValueOnce({
				command: "dokku ps:report my-app",
				exitCode: 0,
				stdout: "Myapp deployed state: running",
				stderr: "",
			})
			.mockResolvedValueOnce({
				command: "dokku domains:report my-app",
				exitCode: 0,
				stdout: "Myapp domains vhosts:",
				stderr: "",
			});

		const result = await getAppDetail("my-app");

		const app = result as AppDetail;
		expect(app.domains).toEqual([]);
	});
});

describe("restartApp", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute restart command for valid app", async () => {
		const appName = "my-app";
		const expectedResult: CommandResult = {
			command: `dokku ps:restart ${appName}`,
			exitCode: 0,
			stdout: "Restarting my-app...",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await restartApp(appName);

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledWith(`dokku ps:restart ${appName}`);
	});

	it("should return validation error for invalid app name", async () => {
		const result = await restartApp("MyApp");

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});

describe("rebuildApp", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute rebuild command for valid app", async () => {
		const appName = "my-app";
		const expectedResult: CommandResult = {
			command: `dokku ps:rebuild ${appName}`,
			exitCode: 0,
			stdout: "Rebuilding my-app...",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await rebuildApp(appName);

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledWith(`dokku ps:rebuild ${appName}`);
	});

	it("should return validation error for invalid app name", async () => {
		const result = await rebuildApp("my_app");

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});

describe("scaleApp", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should execute scale command with valid parameters", async () => {
		const appName = "my-app";
		const processType = "web";
		const count = 3;
		const expectedResult: CommandResult = {
			command: `dokku ps:scale ${appName} ${processType}=${count}`,
			exitCode: 0,
			stdout: `Scaling ${processType} to ${count}`,
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await scaleApp(appName, processType, count);

		expect(result).toEqual(expectedResult);
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			`dokku ps:scale ${appName} ${processType}=${count}`
		);
	});

	it("should return validation error for invalid app name", async () => {
		const result = await scaleApp("MyApp", "web", 2);

		expect(result).toEqual({
			error: "Invalid app name",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid process type", async () => {
		let result = await scaleApp("my-app", "", 2);
		expect(result).toEqual({
			error: "Invalid process type",
			command: "",
			exitCode: 400,
		});

		result = await scaleApp("my-app", "Web_Proxy", 2);
		expect(result).toEqual({
			error: "Invalid process type",
			command: "",
			exitCode: 400,
		});

		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid count (negative)", async () => {
		const result = await scaleApp("my-app", "web", -1);

		expect(result).toEqual({
			error: "Process count must be between 0 and 100",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return validation error for invalid count (too large)", async () => {
		const result = await scaleApp("my-app", "web", 101);

		expect(result).toEqual({
			error: "Process count must be between 0 and 100",
			command: "",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should accept zero as valid count", async () => {
		const expectedResult: CommandResult = {
			command: "dokku ps:scale my-app web=0",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await scaleApp("my-app", "web", 0);

		expect(result).toEqual(expectedResult);
	});

	it("should accept 100 as valid count (maximum)", async () => {
		const expectedResult: CommandResult = {
			command: "dokku ps:scale my-app web=100",
			exitCode: 0,
			stdout: "",
			stderr: "",
		};
		mockExecuteCommand.mockResolvedValue(expectedResult);

		const result = await scaleApp("my-app", "web", 100);

		expect(result).toEqual(expectedResult);
	});
});
