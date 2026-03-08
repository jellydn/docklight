import { describe, it, expect } from "vitest";
import { parseStatus, parseDeployTime, parseDomains } from "./apps.js";

describe("parseStatus", () => {
	it("should parse 'deployed state: running' format", () => {
		const stdout = `App deployed state: running\nProcesses: 1`;
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should parse 'deployed state: stopped' format", () => {
		const stdout = `App deployed state: stopped\nProcesses: 0`;
		expect(parseStatus(stdout)).toBe("stopped");
	});

	it("should parse process status format", () => {
		const stdout = `status web 1: running\nstatus worker 1: stopped`;
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should return stopped when all processes are stopped", () => {
		const stdout = `status web 1: stopped\nstatus worker 1: stopped`;
		expect(parseStatus(stdout)).toBe("stopped");
	});

	it("should parse boolean 'running: true' format", () => {
		const stdout = `Running: true\nDeployed: false`;
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should parse boolean 'running: false' format", () => {
		const stdout = `Running: false\nDeployed: true`;
		expect(parseStatus(stdout)).toBe("stopped");
	});

	it("should handle empty output", () => {
		expect(parseStatus("")).toBe("stopped");
	});

	it("should handle whitespace-only output", () => {
		expect(parseStatus("   \n\t  ")).toBe("stopped");
	});

	it("should be case insensitive", () => {
		const stdout = `App Deployed State: RUNNING`;
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should handle ANSI escape codes", () => {
		const stdout = "\x1b[32mApp deployed state: running\x1b[0m";
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should prefer deployed state over process status", () => {
		const stdout = `deployed state: stopped\nstatus web 1: running`;
		expect(parseStatus(stdout)).toBe("stopped");
	});

	it("should ignore 'app deployed' key", () => {
		const stdout = `app deployed: true\nrunning: false`;
		expect(parseStatus(stdout)).toBe("stopped");
	});
});

describe("parseDeployTime", () => {
	it("should parse standard deploy time format", () => {
		const stdout = `App deployed at: 2024-03-15 14:30:25`;
		expect(parseDeployTime(stdout)).toBe("2024-03-15 14:30:25");
	});

	it("should parse deploy time with 'deployed at' in different case", () => {
		const stdout = `Last Deployed At: 2023-12-01 09:15:00`;
		expect(parseDeployTime(stdout)).toBe("2023-12-01 09:15:00");
	});

	it("should return undefined when no deploy time found", () => {
		const stdout = `App status: running\nProcesses: 2`;
		expect(parseDeployTime(stdout)).toBeUndefined();
	});

	it("should handle empty output", () => {
		expect(parseDeployTime("")).toBeUndefined();
	});

	it("should extract first valid date when multiple present", () => {
		const stdout = `App deployed at: 2024-01-01 00:00:00\nAnother date: 2024-06-15 12:00:00`;
		expect(parseDeployTime(stdout)).toBe("2024-01-01 00:00:00");
	});

	it("should handle ANSI escape codes", () => {
		const stdout = "\x1b[36mApp deployed at: 2024-07-20 18:45:30\x1b[0m";
		expect(parseDeployTime(stdout)).toBe("2024-07-20 18:45:30");
	});

	it("should not match invalid date formats", () => {
		const stdout = `deployed at: 2024/03/15 14:30:25`;
		expect(parseDeployTime(stdout)).toBeUndefined();
	});
});

describe("parseDomains", () => {
	it("should parse domains vhosts format", () => {
		const stdout = `Domains app vhosts: example.com www.example.com`;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should parse domains vhosts with single domain", () => {
		const stdout = `Domains app vhosts: myapp.dokku.me`;
		expect(parseDomains(stdout)).toEqual(["myapp.dokku.me"]);
	});

	it("should parse 'domains vhosts' format (without 'app')", () => {
		const stdout = `domains vhosts: app.example.com api.example.com`;
		expect(parseDomains(stdout)).toEqual(["app.example.com", "api.example.com"]);
	});

	it("should return empty array when no domains found", () => {
		const stdout = `App name: myapp\nStatus: running`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should filter out dash placeholder", () => {
		const stdout = `Domains app vhosts: -`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should filter out '(none)' placeholder", () => {
		const stdout = `Domains app vhosts: (none)`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should handle case insensitive matching", () => {
		const stdout = `DOMAINS APP VHOSTS: EXAMPLE.COM`;
		expect(parseDomains(stdout)).toEqual(["EXAMPLE.COM"]);
	});

	it("should handle ANSI escape codes", () => {
		const stdout = "\x1b[32mDomains app vhosts: example.com\x1b[0m";
		expect(parseDomains(stdout)).toEqual(["example.com"]);
	});

	it("should deduplicate domains", () => {
		const stdout = `Domains app vhosts: example.com example.com www.example.com`;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should handle extra whitespace", () => {
		const stdout = `Domains app vhosts:   example.com    www.example.com  `;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should handle multiple domains lines", () => {
		const stdout = `Domains app vhosts: example.com
Domains app vhosts: www.example.com`;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should handle empty domains list", () => {
		const stdout = `Domains app vhosts:`;
		expect(parseDomains(stdout)).toEqual([]);
	});
});
