import { describe, it, expect } from "vitest";
import { parseGitReport } from "./git.js";

describe("parseGitReport", () => {
	it("should parse complete git report", () => {
		const stdout = `Git deploy branch: main
Git global deploy branch: master
Git keep git dir: true
Git rev env var: GIT_REV
Git sha: abc123def456
Git source image: myapp:latest
Git last updated at: 2024-03-15 14:30:25`;

		const result = parseGitReport(stdout);
		expect(result).toEqual({
			deployBranch: "main",
			globalDeployBranch: "master",
			keepGitDir: true,
			revEnvVar: "GIT_REV",
			sha: "abc123def456",
			sourceImage: "myapp:latest",
			lastUpdatedAt: "2024-03-15T14:30:25.000Z",
		});
	});

	it("should parse with empty values", () => {
		const stdout = `Git deploy branch:
Git global deploy branch:
Git keep git dir: false
Git rev env var:
Git sha:
Git source image:
Git last updated at:`;

		const result = parseGitReport(stdout);
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

	it("should handle empty output", () => {
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

	it("should handle whitespace-only output", () => {
		const result = parseGitReport("   \n\t  \n  ");
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

	it("should handle ANSI escape codes", () => {
		const stdout = "\x1b[32mGit deploy branch:\x1b[0m \x1b[36mmain\x1b[0m";
		const result = parseGitReport(stdout);
		expect(result.deployBranch).toBe("main");
	});

	it("should parse branch names with special characters", () => {
		const stdout = `Git deploy branch: feature/test-123_something`;
		const result = parseGitReport(stdout);
		expect(result.deployBranch).toBe("feature/test-123_something");
	});

	it("should handle values with spaces", () => {
		const stdout = `Git source image: registry.example.com/myapp:v1.0.0-beta`;
		const result = parseGitReport(stdout);
		expect(result.sourceImage).toBe("registry.example.com/myapp:v1.0.0-beta");
	});

	it("should parse sha values of different lengths", () => {
		const stdout = `Git sha: a1b2c3d4e5f6`;
		const result = parseGitReport(stdout);
		expect(result.sha).toBe("a1b2c3d4e5f6");
	});

	it("should handle 'true' case insensitively for keepGitDir", () => {
		const stdout = `Git keep git dir: TRUE`;
		const result = parseGitReport(stdout);
		expect(result.keepGitDir).toBe(true);
	});

	it("should handle 'True' for keepGitDir", () => {
		const stdout = `Git keep git dir: True`;
		const result = parseGitReport(stdout);
		expect(result.keepGitDir).toBe(true);
	});

	it("should handle any non-true value as false for keepGitDir", () => {
		const stdout = `Git keep git dir: yes`;
		const result = parseGitReport(stdout);
		expect(result.keepGitDir).toBe(false);
	});

	it("should handle extra whitespace around values", () => {
		const stdout = `Git deploy branch:   main   `;
		const result = parseGitReport(stdout);
		expect(result.deployBranch).toBe("main");
	});

	it("should ignore unknown fields", () => {
		const stdout = `Git deploy branch: main
Unknown field: some value
Git sha: abc123`;
		const result = parseGitReport(stdout);
		expect(result.deployBranch).toBe("main");
		expect(result.sha).toBe("abc123");
	});

	it("should handle fields in any order", () => {
		const stdout = `Git sha: def789
Git deploy branch: develop
Git source image: myapp:dev`;
		const result = parseGitReport(stdout);
		expect(result.deployBranch).toBe("develop");
		expect(result.sha).toBe("def789");
		expect(result.sourceImage).toBe("myapp:dev");
	});

	it("should handle last updated with ISO format", () => {
		const stdout = `Git last updated at: 2024-01-15T10:30:00Z`;
		const result = parseGitReport(stdout);
		expect(result.lastUpdatedAt).toBe("2024-01-15T10:30:00.000Z");
	});
});
