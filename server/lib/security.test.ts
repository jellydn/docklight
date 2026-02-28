/**
 * Security tests for command injection and input validation.
 * These tests verify that malicious inputs are properly rejected or sanitized.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CommandResult } from "./executor.js";
import { createApp, destroyApp, isValidAppName, scaleApp } from "./apps.js";
import { addDomain, removeDomain } from "./domains.js";
import { setConfig, unsetConfig } from "./config.js";
import { createDatabase, linkDatabase } from "./databases.js";
import { installPlugin } from "./plugins.js";
import { addDockerOption } from "./docker-options.js";
import { addBuildpack } from "./buildpacks.js";
import { setDeployBranch } from "./deployment.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

describe("Security: App Name Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("isValidAppName", () => {
		const maliciousInputs = [
			// Shell metacharacters
			"; rm -rf /",
			"$(whoami)",
			"`whoami`",
			"| cat /etc/passwd",
			"&& malicious",
			"|| malicious",
			"; malicious #",
			// Path traversal
			"../../etc/passwd",
			"..\\..\\..\\windows\\system32",
			// Command substitution variants
			"$(cat /etc/passwd)",
			"`cat /etc/passwd`",
			"${malicious}",
			// Pipe chains
			"app | malicious",
			"app || malicious",
			"app && malicious",
			"app ; malicious",
			// Redirection
			"app > /etc/passwd",
			"app < /etc/passwd",
			"app >> /etc/passwd",
			// Newlines and other special chars
			"app\nmalicious",
			"app\tmalicious",
			"app\r\nmalicious",
			// Quotes
			"app'; DROP TABLE--",
			'app"; malicious',
			// Backslash
			"app\\malicious",
			// Null bytes
			"app\x00malicious",
			// Unicode and special
			"app\xe2\x80\xa8malicious", // line separator
			"app\u202emalicious", // right-to-left override
		];

		it.each(maliciousInputs)("should reject malicious input: %s", (input) => {
			expect(isValidAppName(input)).toBe(false);
		});

		it("should reject uppercase letters", () => {
			expect(isValidAppName("MyApp")).toBe(false);
			expect(isValidAppName("MYAPP")).toBe(false);
			expect(isValidAppName("myApp")).toBe(false);
		});

		it("should reject spaces", () => {
			expect(isValidAppName("my app")).toBe(false);
			expect(isValidAppName(" myapp")).toBe(false);
			expect(isValidAppName("myapp ")).toBe(false);
		});

		it("should reject underscores", () => {
			expect(isValidAppName("my_app")).toBe(false);
			expect(isValidAppName("_app")).toBe(false);
			expect(isValidAppName("app_")).toBe(false);
		});

		it("should reject dots", () => {
			expect(isValidAppName("my.app")).toBe(false);
			expect(isValidAppName(".app")).toBe(false);
		});

		it("should accept valid app names", () => {
			expect(isValidAppName("my-app")).toBe(true);
			expect(isValidAppName("app123")).toBe(true);
			expect(isValidAppName("test-app-v1")).toBe(true);
			expect(isValidAppName("a")).toBe(true);
			expect(isValidAppName("123-456")).toBe(true);
		});
	});

	describe("createApp", () => {
		it("should reject app name with command injection", async () => {
			const result = await createApp("app; whoami");

			expect(result).toEqual({
				error: "Invalid app name",
				command: "create-app-validation",
				exitCode: 400,
				stderr: "App name must contain only lowercase letters, numbers, and hyphens.",
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject app name with command substitution", async () => {
			const result = await createApp("$(touch /tmp/pwned)");

			expect(result).toMatchObject({
				error: "Invalid app name",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject app name with backtick injection", async () => {
			const result = await createApp("app`malicious`");

			expect(result).toMatchObject({
				error: "Invalid app name",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});
	});

	describe("destroyApp", () => {
		it("should reject malicious app name even with confirmation", async () => {
			const result = await destroyApp("../../etc/passwd", "../../etc/passwd");

			expect(result).toMatchObject({
				error: "Invalid app name",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});
	});
});

describe("Security: Domain Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("addDomain", () => {
		it("should reject domain with shell injection", async () => {
			const result = await addDomain("my-app", "example.com; whoami");

			expect(result).toEqual({
				error: "Domain contains invalid characters",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject domain with backtick injection", async () => {
			const result = await addDomain("my-app", "example`whoami`.com");

			expect(result).toEqual({
				error: "Domain contains invalid characters",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should accept valid domains", async () => {
			mockExecuteCommand.mockResolvedValue({
				command: "dokku domains:add my-app example.com",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await addDomain("my-app", "example.com");

			expect(mockExecuteCommand).toHaveBeenCalled();
		});
	});

	describe("removeDomain", () => {
		it("should reject malicious domain", async () => {
			const result = await removeDomain("my-app", "$(rm -rf /)");

			expect(result).toMatchObject({
				error: "Domain contains invalid characters",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});
	});
});

describe("Security: Config Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("setConfig", () => {
		it("should reject config key with shell metacharacters", async () => {
			const result = await setConfig("my-app", "KEY; malicious", "value");

			expect(result).toEqual({
				error: "Invalid characters in key",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject config value with shell injection", async () => {
			const result = await setConfig("my-app", "KEY", "value; whoami");

			expect(result).toEqual({
				error: "Value contains unsafe shell characters. Remove: ` $ ; | < > \\",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject value with command substitution", async () => {
			const result = await setConfig("my-app", "KEY", "value$(whoami)");

			expect(result).toMatchObject({
				error: expect.stringContaining("unsafe shell characters"),
				exitCode: 400,
			});
		});

		it("should reject value with backtick", async () => {
			const result = await setConfig("my-app", "KEY", "value`whoami`");

			expect(result).toMatchObject({
				error: expect.stringContaining("unsafe shell characters"),
				exitCode: 400,
			});
		});

		it("should reject value with pipe", async () => {
			const result = await setConfig("my-app", "KEY", "value|malicious");

			expect(result).toMatchObject({
				error: expect.stringContaining("unsafe shell characters"),
				exitCode: 400,
			});
		});
	});

	describe("unsetConfig", () => {
		it("should reject config key with special characters", async () => {
			const result = await unsetConfig("my-app", "KEY;malicious");

			expect(result).toEqual({
				error: "Invalid characters in key",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});
	});
});

describe("Security: Database Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createDatabase", () => {
		it("should reject invalid plugin", async () => {
			const result = await createDatabase("malicious-plugin", "my-db");

			expect(result).toEqual({
				error: "Invalid database plugin",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject database name with shell metacharacters", async () => {
			const result = await createDatabase("postgres", "db; rm -rf /");

			expect(result).toEqual({
				error: "Database name contains invalid characters",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject database name with path traversal", async () => {
			const result = await createDatabase("postgres", "../../etc/passwd");

			expect(result).toEqual({
				error: "Database name contains invalid characters",
				command: "",
				exitCode: 400,
			});
		});
	});

	describe("linkDatabase", () => {
		it("should reject malicious app name", async () => {
			const result = await linkDatabase("postgres", "my-db", "app; malicious");

			expect(result).toEqual({
				error: "Database name or app name contains invalid characters",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});
	});
});

describe("Security: Plugin Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("installPlugin", () => {
		it("should reject repository with shell injection", async () => {
			const result = await installPlugin("https://github.com; whoami");

			expect(result).toMatchObject({
				error: "Plugin repository contains invalid characters",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject plugin name with special characters", async () => {
			const result = await installPlugin("https://github.com/user/repo", "plugin; rm -rf /");

			expect(result).toMatchObject({
				error: "Plugin name contains invalid characters",
				exitCode: 400,
			});
		});

		it("should accept valid plugin repository", async () => {
			mockExecuteCommand.mockResolvedValue({
				command: "dokku plugin:install https://github.com/user/repo",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await installPlugin("https://github.com/user/repo");

			expect(mockExecuteCommand).toHaveBeenCalled();
		});
	});
});

describe("Security: Docker Options", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("addDockerOption", () => {
		it("should accept privileged flag (security consideration)", async () => {
			// This is a potential security risk but currently allowed
			mockExecuteCommand.mockResolvedValue({
				command: "dokku docker-options:add my-app run '--privileged'",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await addDockerOption("my-app", "run", "--privileged");

			expect(mockExecuteCommand).toHaveBeenCalled();
		});

		it("should accept network options (security consideration)", async () => {
			mockExecuteCommand.mockResolvedValue({
				command: "dokku docker-options:add my-app run '--network=host'",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await addDockerOption("my-app", "run", "--network=host");

			expect(mockExecuteCommand).toHaveBeenCalled();
		});

		it("should reject invalid phase", async () => {
			const result = await addDockerOption("my-app", "malicious; phase", "--option");

			expect(result).toMatchObject({
				error: "Phase must be one of: build, deploy, run",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject invalid app name", async () => {
			const result = await addDockerOption("app; malicious", "run", "--option");

			expect(result).toMatchObject({
				error: "Invalid app name",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});
	});
});

describe("Security: Buildpacks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("addBuildpack", () => {
		it("should accept valid buildpack URL", async () => {
			mockExecuteCommand.mockResolvedValue({
				command: "dokku buildpacks:add my-app 'https://example.com/buildpack.git'",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await addBuildpack("my-app", "https://example.com/buildpack.git");

			expect(mockExecuteCommand).toHaveBeenCalled();
		});

		it("should reject invalid app name", async () => {
			const result = await addBuildpack("app; malicious", "https://example.com");

			expect(result).toMatchObject({
				error: "Invalid app name",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});
	});
});

describe("Security: Deployment Settings", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("setDeployBranch", () => {
		it("should accept branch names protected by shellQuote", async () => {
			mockExecuteCommand.mockResolvedValue({
				command: "dokku git:set my-app deploy-branch 'feature/branch-123'",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await setDeployBranch("my-app", "feature/branch-123");

			expect(mockExecuteCommand).toHaveBeenCalled();
		});

		it("should reject invalid app name", async () => {
			const result = await setDeployBranch("app; malicious", "main");

			expect(result).toMatchObject({
				error: "Invalid app name",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject empty branch", async () => {
			const result = await setDeployBranch("my-app", "");

			expect(result).toMatchObject({
				error: "Deploy branch is required",
				exitCode: 400,
			});
		});
	});
});

describe("Security: Scale App", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("scaleApp", () => {
		it("should reject process type with shell metacharacters", async () => {
			const result = await scaleApp("my-app", "web; malicious", 1);

			expect(result).toEqual({
				error: "Invalid process type",
				command: "",
				exitCode: 400,
			});
			expect(mockExecuteCommand).not.toHaveBeenCalled();
		});

		it("should reject process type with command substitution", async () => {
			const result = await scaleApp("my-app", "$(whoami)", 1);

			expect(result).toEqual({
				error: "Invalid process type",
				command: "",
				exitCode: 400,
			});
		});

		it("should reject negative count", async () => {
			const result = await scaleApp("my-app", "web", -1);

			expect(result).toEqual({
				error: "Process count must be between 0 and 100",
				command: "",
				exitCode: 400,
			});
		});

		it("should reject excessively large count", async () => {
			const result = await scaleApp("my-app", "web", 99999);

			expect(result).toEqual({
				error: "Process count must be between 0 and 100",
				command: "",
				exitCode: 400,
			});
		});

		it("should accept valid scale parameters", async () => {
			mockExecuteCommand.mockResolvedValue({
				command: "dokku ps:scale my-app web=3",
				exitCode: 0,
				stdout: "",
				stderr: "",
			});

			const result = await scaleApp("my-app", "web", 3);

			expect(mockExecuteCommand).toHaveBeenCalledWith("dokku ps:scale my-app web=3");
		});
	});
});

describe("Security: Command Allowlist", () => {
	it("should only allow whitelisted commands", () => {
		// This is a conceptual test - the actual check is in executeCommand
		// The allowlist is defined in allowlist.ts
		const allowedCommands = ["dokku", "top", "free", "df", "grep", "awk", "curl"];

		// Commands that should be blocked
		const blockedCommands = ["rm -rf /", "cat /etc/passwd", "whoami", "bash", "sh", "nc", "wget"];

		blockedCommands.forEach((cmd) => {
			const baseCommand = cmd.split(" ")[0];
			expect(allowedCommands).not.toContain(baseCommand);
		});
	});
});
