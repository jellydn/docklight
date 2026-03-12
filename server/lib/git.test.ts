import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGitInfo, syncFromRepo, isValidRepoUrl, parseGitReport } from "./git.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("parseGitReport", () => {
	it("should parse all git report fields", () => {
		const stdout = [
			"=====> my-app git information",
			"       Git deploy branch:           main",
			"       Git global deploy branch:    master",
			"       Git keep git dir:            false",
			"       Git rev env var:             GIT_REV",
			"       Git sha:                     abc1234def5678",
			"       Git source image:            ",
			"       Git last updated at:         2024-01-15 10:30:00 +0000",
		].join("\n");

		const result = parseGitReport(stdout);

		expect(result).toEqual({
			deployBranch: "main",
			globalDeployBranch: "master",
			keepGitDir: false,
			revEnvVar: "GIT_REV",
			sha: "abc1234def5678",
			sourceImage: "",
			lastUpdatedAt: "2024-01-15T10:30:00.000Z",
		});
	});

	it("should return defaults for empty output", () => {
		const result = parseGitReport("");

		expect(result).toEqual({
			deployBranch: "",
			globalDeployBranch: "",
			keepGitDir: false,
			revEnvVar: "",
			sha: "",
			sourceImage: "",
			lastUpdatedAt: "",
		});
	});

	it("should strip ANSI codes from output", () => {
		const stdout = "       Git deploy branch: \u001b[32mmain\u001b[0m";
		const result = parseGitReport(stdout);

		expect(result.deployBranch).toBe("main");
	});

	it("should parse keepGitDir as true", () => {
		const stdout = "       Git keep git dir:            true";
		const result = parseGitReport(stdout);

		expect(result.keepGitDir).toBe(true);
	});

	it("should parse source image when set", () => {
		const stdout = "       Git source image:            ghcr.io/myuser/myimage:latest";
		const result = parseGitReport(stdout);

		expect(result.sourceImage).toBe("ghcr.io/myuser/myimage:latest");
	});
});

describe("getGitInfo", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await getGitInfo("INVALID APP!");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return parsed git info on success", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku git:report my-app",
			exitCode: 0,
			stdout: [
				"=====> my-app git information",
				"       Git deploy branch:           main",
				"       Git global deploy branch:    master",
				"       Git keep git dir:            false",
				"       Git rev env var:             GIT_REV",
				"       Git sha:                     abc1234",
				"       Git source image:            ",
				"       Git last updated at:         2024-01-15 10:30:00 +0000",
			].join("\n"),
			stderr: "",
		});

		const result = await getGitInfo("my-app");

		expect(result).toEqual({
			deployBranch: "main",
			globalDeployBranch: "master",
			keepGitDir: false,
			revEnvVar: "GIT_REV",
			sha: "abc1234",
			sourceImage: "",
			lastUpdatedAt: "2024-01-15T10:30:00.000Z",
		});
	});

	it("should return error when git:report fails", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku git:report my-app",
			exitCode: 1,
			stdout: "",
			stderr: "app not found",
		});

		const result = await getGitInfo("my-app");

		expect(result).toMatchObject({
			error: "Failed to get git info",
			exitCode: 1,
			stderr: "app not found",
		});
	});
});

describe("syncFromRepo", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("should return error for invalid app name", async () => {
		const result = await syncFromRepo("INVALID!", "https://github.com/user/repo.git");

		expect(result).toMatchObject({
			error: "Invalid app name",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error when repo URL is empty", async () => {
		const result = await syncFromRepo("my-app", "");

		expect(result).toMatchObject({
			error: "Repository URL is required",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should return error for invalid repo URL", async () => {
		const result = await syncFromRepo("my-app", "not-a-valid-url");

		expect(result).toMatchObject({
			error: "Invalid repository URL",
			exitCode: 400,
		});
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it("should execute sync command with https URL", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku git:sync --build 'my-app' 'https://github.com/user/repo.git'",
			exitCode: 0,
			stdout: "Syncing...",
			stderr: "",
		});

		const result = await syncFromRepo("my-app", "https://github.com/user/repo.git");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku git:sync --build 'my-app' 'https://github.com/user/repo.git'",
			120000
		);
	});

	it("should execute sync command with branch specified", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku git:sync --build 'my-app' 'https://github.com/user/repo.git' 'develop'",
			exitCode: 0,
			stdout: "Syncing...",
			stderr: "",
		});

		const result = await syncFromRepo("my-app", "https://github.com/user/repo.git", "develop");

		expect(result).toMatchObject({ exitCode: 0 });
		expect(mockExecuteCommand).toHaveBeenCalledWith(
			"dokku git:sync --build 'my-app' 'https://github.com/user/repo.git' 'develop'",
			120000
		);
	});

	it("should execute sync command with git@ URL", async () => {
		mockExecuteCommand.mockResolvedValueOnce({
			command: "dokku git:sync --build 'my-app' 'git@github.com:user/repo.git'",
			exitCode: 0,
			stdout: "Syncing...",
			stderr: "",
		});

		const result = await syncFromRepo("my-app", "git@github.com:user/repo.git");

		expect(result).toMatchObject({ exitCode: 0 });
	});
});

describe("isValidRepoUrl", () => {
	it("should accept https URLs", () => {
		expect(isValidRepoUrl("https://github.com/user/repo.git")).toBe(true);
		expect(isValidRepoUrl("http://gitlab.com/user/repo")).toBe(true);
	});

	it("should accept git@ SSH URLs", () => {
		expect(isValidRepoUrl("git@github.com:user/repo.git")).toBe(true);
		expect(isValidRepoUrl("git@gitlab.com:org/project.git")).toBe(true);
	});

	it("should accept ssh:// URLs", () => {
		expect(isValidRepoUrl("ssh://git@github.com/user/repo.git")).toBe(true);
	});

	it("should reject invalid URLs", () => {
		expect(isValidRepoUrl("not-a-url")).toBe(false);
		expect(isValidRepoUrl("")).toBe(false);
		expect(isValidRepoUrl("ftp://example.com/repo")).toBe(false);
		expect(isValidRepoUrl("just-a-string")).toBe(false);
	});
});
