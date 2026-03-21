import { describe, it, expect } from "vitest";
import { parsePortMappings } from "./ports.js";

describe("parsePortMappings", () => {
	it("should parse ports map key format from ports:report", () => {
		const stdout = [
			"=====> my-app ports information",
			"       Ports map:             http:80:5000 https:443:5000",
		].join("\n");
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "http", hostPort: 80, containerPort: 5000 },
			{ scheme: "https", hostPort: 443, containerPort: 5000 },
		]);
	});

	it("should parse single http mapping", () => {
		const stdout = "       Ports map:             http:3000:3000";
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "http", hostPort: 3000, containerPort: 3000 },
		]);
	});

	it("should parse tcp scheme", () => {
		const stdout = "       Ports map:             tcp:2222:22";
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "tcp", hostPort: 2222, containerPort: 22 },
		]);
	});

	it("should return empty array when no mappings found", () => {
		const stdout = "=====> my-app ports information";
		expect(parsePortMappings(stdout)).toEqual([]);
	});

	it("should strip ANSI codes from output", () => {
		const stdout = "       Ports map:             \u001b[32mhttp:80:5000\u001b[0m";
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "http", hostPort: 80, containerPort: 5000 },
		]);
	});

	it("should parse older Dokku proxy:ports line-per-mapping format", () => {
		const stdout = [
			"=====> my-app proxy ports",
			"http:80:5000",
			"https:443:5000",
		].join("\n");
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "http", hostPort: 80, containerPort: 5000 },
			{ scheme: "https", hostPort: 443, containerPort: 5000 },
		]);
	});

	it("should parse Dokku 0.30.x proxy:ports single port per line", () => {
		const stdout = [
			"=====> my-app proxy information",
			"       http:3000:3000",
		].join("\n");
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "http", hostPort: 3000, containerPort: 3000 },
		]);
	});

	it("should parse Dokku 0.31.x ports:report format", () => {
		const stdout = [
			"=====> my-app ports information",
			"       Ports map:                     http:80:5000 https:443:5000",
			"       Ports map detected:            http:80:5000 https:443:5000",
		].join("\n");
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "http", hostPort: 80, containerPort: 5000 },
			{ scheme: "https", hostPort: 443, containerPort: 5000 },
		]);
	});

	it("should parse Dokku 0.34.x ports:report with single mapping", () => {
		const stdout = [
			"=====> my-app ports information",
			"       Ports map:                     http:8080:8080",
		].join("\n");
		expect(parsePortMappings(stdout)).toEqual([
			{ scheme: "http", hostPort: 8080, containerPort: 8080 },
		]);
	});

	it("should return empty array for empty output", () => {
		expect(parsePortMappings("")).toEqual([]);
	});

	it("should parse ports map line but not ports map detected line", () => {
		const stdout = [
			"       Ports map:             http:80:5000",
			"       Ports map detected:    http:80:5000",
		].join("\n");
		const result = parsePortMappings(stdout);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ scheme: "http", hostPort: 80, containerPort: 5000 });
	});
});
