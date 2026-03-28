import { describe, it, expect } from "vitest";
import { parseStatus, toISODateTime, parseDomains, parseProcesses } from "./apps.js";

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

	it("should use Running key, not Deployed key, for status", () => {
		const stdout = `Deployed:                      true\nProcesses:                     1\nRunning:                       false`;
		expect(parseStatus(stdout)).toBe("stopped");
	});

	it("should detect running from Running key in standard ps:report format", () => {
		const stdout = `Deployed:                      true\nProcesses:                     1\nRunning:                       true`;
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should parse Dokku 0.30.x ps:report with status lines only", () => {
		const stdout = [
			"=====> myapp ps information",
			"       Deployed:                      true",
			"       Processes:                     1",
			"       Ps can scale:                  true",
			"       Running:                       true",
			"       Status web 1:                  running (CID: abc123def456)",
		].join("\n");
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should parse Dokku 0.31.x ps:report with deployed state key", () => {
		const stdout = [
			"=====> myapp ps information",
			"       Deployed:                      true",
			"       Processes:                     1",
			"       Ps can scale:                  true",
			"       Deployed state:                running",
			"       Running:                       true",
		].join("\n");
		expect(parseStatus(stdout)).toBe("running");
	});

	it("should detect stopped from Dokku 0.31.x deployed state", () => {
		const stdout = [
			"=====> myapp ps information",
			"       Deployed:                      true",
			"       Processes:                     0",
			"       Deployed state:                stopped",
			"       Running:                       false",
		].join("\n");
		expect(parseStatus(stdout)).toBe("stopped");
	});

	it("should parse Dokku 0.34.x ps:report full output running", () => {
		const stdout = [
			"=====> myapp ps information",
			"       Deployed:                      true",
			"       Processes:                     2",
			"       Ps can scale:                  true",
			"       Ps computed procfile path:     Procfile",
			"       Deployed state:                running",
			"       Running:                       true",
			"       Status web 1:                  running (CID: abc123)",
			"       Status web 2:                  running (CID: def456)",
			"       Process type scale:            web=2",
		].join("\n");
		expect(parseStatus(stdout)).toBe("running");
	});
});

describe("toISODateTime", () => {
	it("should convert space-separated datetime to ISO format", () => {
		expect(toISODateTime("2024-03-15 14:30:25")).toBe("2024-03-15T14:30:25.000Z");
	});

	it("should pass through ISO format", () => {
		expect(toISODateTime("2024-01-15T10:30:00Z")).toBe("2024-01-15T10:30:00.000Z");
	});

	it("should return undefined for empty string", () => {
		expect(toISODateTime("")).toBeUndefined();
	});

	it("should return undefined for undefined", () => {
		expect(toISODateTime(undefined)).toBeUndefined();
	});

	it("should return undefined for whitespace-only string", () => {
		expect(toISODateTime("   ")).toBeUndefined();
	});

	it("should return undefined for invalid date string", () => {
		expect(toISODateTime("not-a-date")).toBeUndefined();
	});

	it("should handle datetime with timezone offset from Dokku", () => {
		expect(toISODateTime("2024-01-15 10:30:00 +0000")).toBe("2024-01-15T10:30:00.000Z");
	});

	it("should handle Unix timestamp (seconds)", () => {
		const result = toISODateTime("1773268058");
		expect(result).toBeDefined();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	});

	it("should handle 9-digit Unix timestamp", () => {
		const result = toISODateTime("100000000");
		expect(result).toBe("1973-03-03T09:46:40.000Z");
	});
});

describe("parseDomains", () => {
	it("should parse domains vhosts format", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts: example.com www.example.com`;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should parse domains vhosts with single domain", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts: myapp.dokku.me`;
		expect(parseDomains(stdout)).toEqual(["myapp.dokku.me"]);
	});

	it("should return empty array when app domains disabled", () => {
		const stdout = `Domains app enabled:           false\nDomains app vhosts: sky-alert.itman.fyi`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should return empty array when no domains found", () => {
		const stdout = `App name: myapp\nStatus: running`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should filter out dash placeholder", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts: -`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should filter out '(none)' placeholder", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts: (none)`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should handle case insensitive matching", () => {
		const stdout = `DOMAINS APP ENABLED:           TRUE\nDOMAINS APP VHOSTS: EXAMPLE.COM`;
		expect(parseDomains(stdout)).toEqual(["EXAMPLE.COM"]);
	});

	it("should handle ANSI escape codes", () => {
		const stdout =
			"\x1b[32mDomains app enabled:           true\x1b[0m\n\x1b[32mDomains app vhosts: example.com\x1b[0m";
		expect(parseDomains(stdout)).toEqual(["example.com"]);
	});

	it("should deduplicate domains", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts: example.com example.com www.example.com`;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should handle extra whitespace", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts:   example.com    www.example.com  `;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should handle multiple domains lines", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts: example.com
Domains app vhosts: www.example.com`;
		expect(parseDomains(stdout)).toEqual(["example.com", "www.example.com"]);
	});

	it("should handle empty domains list", () => {
		const stdout = `Domains app enabled:           true\nDomains app vhosts:`;
		expect(parseDomains(stdout)).toEqual([]);
	});

	it("should return domains when enabled key is absent but vhosts line is present", () => {
		const stdout = `Domains app vhosts: myapp.example.com`;
		expect(parseDomains(stdout)).toEqual(["myapp.example.com"]);
	});

	it("should parse Dokku 0.30.x domains:report output", () => {
		const stdout = [
			"=====> myapp domains information",
			"       Domains app enabled:           true",
			"       Domains app vhosts:            myapp.dokku.me",
			"       Domains global enabled:        true",
			"       Domains global vhosts:         dokku.me",
		].join("\n");
		expect(parseDomains(stdout)).toEqual(["myapp.dokku.me"]);
	});

	it("should parse Dokku 0.31.x domains:report with multiple vhosts", () => {
		const stdout = [
			"=====> myapp domains information",
			"       Domains app enabled:           true",
			"       Domains app vhosts:            myapp.dokku.me www.myapp.com",
			"       Domains global enabled:        true",
			"       Domains global vhosts:         dokku.me",
		].join("\n");
		expect(parseDomains(stdout)).toEqual(["myapp.dokku.me", "www.myapp.com"]);
	});

	it("should parse Dokku 0.34.x domains:report with ANSI colors", () => {
		const stdout = [
			"\x1b[34m=====> myapp domains information\x1b[0m",
			"       \x1b[32mDomains app enabled\x1b[0m:           \x1b[36mtrue\x1b[0m",
			"       \x1b[32mDomains app vhosts\x1b[0m:            \x1b[36mmyapp.dokku.me\x1b[0m",
		].join("\n");
		expect(parseDomains(stdout)).toEqual(["myapp.dokku.me"]);
	});
});

describe("parseProcesses", () => {
	it("should parse process type scale format", () => {
		const stdout = `Process type scale: web=2 worker=1`;
		expect(parseProcesses(stdout)).toEqual({ web: 2, worker: 1 });
	});

	it("should parse status lines for process count", () => {
		const stdout = [
			"       Status web 1:                  running (CID: abc123)",
			"       Status web 2:                  running (CID: def456)",
			"       Status worker 1:               stopped",
		].join("\n");
		expect(parseProcesses(stdout)).toEqual({ web: 2, worker: 1 });
	});

	it("should parse Ps scale key format from Dokku 0.31.x+", () => {
		const stdout = [
			"=====> myapp ps information",
			"       Deployed:                      true",
			"       Ps scale web:                  2",
			"       Ps scale worker:               1",
		].join("\n");
		const result = parseProcesses(stdout);
		expect(result.web).toBe(2);
		expect(result.worker).toBe(1);
	});

	it("should return empty object for unrecognized output", () => {
		const stdout = `Deployed: true\nRunning: true`;
		expect(parseProcesses(stdout)).toEqual({});
	});

	it("should parse Dokku 0.30.x ps:report status lines", () => {
		const stdout = [
			"=====> myapp ps information",
			"       Deployed:                      true",
			"       Processes:                     1",
			"       Ps can scale:                  true",
			"       Running:                       true",
			"       Status web 1:                  running (CID: abc123def456)",
		].join("\n");
		const result = parseProcesses(stdout);
		expect(result.web).toBe(1);
	});

	it("should parse Dokku 0.34.x ps:report with process type scale", () => {
		const stdout = [
			"=====> myapp ps information",
			"       Deployed:                      true",
			"       Processes:                     2",
			"       Ps can scale:                  true",
			"       Deployed state:                running",
			"       Running:                       true",
			"       Status web 1:                  running (CID: abc123)",
			"       Status web 2:                  running (CID: def456)",
			"       Process type scale:            web=2",
		].join("\n");
		const result = parseProcesses(stdout);
		expect(result.web).toBe(2);
	});

	it("should handle empty output", () => {
		expect(parseProcesses("")).toEqual({});
	});
});
