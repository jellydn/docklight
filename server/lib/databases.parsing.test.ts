import { describe, it, expect } from "vitest";
import { parseInstalledPlugins, parseLinkedApps } from "./databases.js";

describe("parseInstalledPlugins", () => {
	it("should detect dokku-postgres from plugin list", () => {
		const output = [
			"00_dokku-standard",
			"dokku-postgres",
			"dokku-builder-dockerfile",
		].join("\n");
		expect(parseInstalledPlugins(output)).toEqual(["postgres"]);
	});

	it("should detect multiple plugins", () => {
		const output = [
			"00_dokku-standard",
			"dokku-postgres",
			"dokku-redis",
			"dokku-mysql",
		].join("\n");
		expect(parseInstalledPlugins(output)).toContain("postgres");
		expect(parseInstalledPlugins(output)).toContain("redis");
		expect(parseInstalledPlugins(output)).toContain("mysql");
	});

	it("should detect all supported plugins", () => {
		const output = [
			"dokku-postgres",
			"dokku-redis",
			"dokku-mysql",
			"dokku-mariadb",
			"dokku-mongo",
		].join("\n");
		const plugins = parseInstalledPlugins(output);
		expect(plugins).toContain("postgres");
		expect(plugins).toContain("redis");
		expect(plugins).toContain("mysql");
		expect(plugins).toContain("mariadb");
		expect(plugins).toContain("mongo");
	});

	it("should return empty array when no supported plugins found", () => {
		const output = [
			"00_dokku-standard",
			"dokku-builder-dockerfile",
			"dokku-letsencrypt",
		].join("\n");
		expect(parseInstalledPlugins(output)).toEqual([]);
	});

	it("should return empty array for empty output", () => {
		expect(parseInstalledPlugins("")).toEqual([]);
	});

	it("should be case insensitive", () => {
		const output = "DOKKU-POSTGRES\nDOKKU-REDIS";
		expect(parseInstalledPlugins(output)).toContain("postgres");
		expect(parseInstalledPlugins(output)).toContain("redis");
	});

	it("should parse Dokku 0.30.x plugin:list output format", () => {
		const output = [
			"00_dokku-standard      0.30.0 enabled    Dokku Standard",
			"dokku-postgres         1.2.3  enabled    Dokku Postgres Plugin",
			"dokku-redis            1.0.0  enabled    Dokku Redis Plugin",
		].join("\n");
		expect(parseInstalledPlugins(output)).toContain("postgres");
		expect(parseInstalledPlugins(output)).toContain("redis");
	});

	it("should parse Dokku 0.34.x plugin:list with version columns", () => {
		const output = [
			"Name                   Version  Status     Description",
			"00_dokku-standard      0.34.0   enabled    Dokku Standard",
			"dokku-postgres         1.3.1    enabled    Postgres Plugin for Dokku",
			"dokku-builder-lambda   0.2.0    enabled    Herokuish lambda builder",
		].join("\n");
		expect(parseInstalledPlugins(output)).toContain("postgres");
		expect(parseInstalledPlugins(output)).not.toContain("redis");
	});

	it("should not produce duplicates when plugin name appears multiple times", () => {
		const output = "dokku-postgres\nPostgres Plugin for Dokku";
		const plugins = parseInstalledPlugins(output);
		expect(plugins.filter((p) => p === "postgres")).toHaveLength(1);
	});
});

describe("parseLinkedApps", () => {
	it("should parse multi-line linked apps from Dokku 0.30.x links output", () => {
		const output = [
			"=====> main-db linked apps",
			"api",
			"worker",
		].join("\n");
		expect(parseLinkedApps(output)).toEqual(["api", "worker"]);
	});

	it("should parse inline comma-separated linked apps", () => {
		const output = "postgres service main-db linked apps: api, worker";
		expect(parseLinkedApps(output)).toEqual(["api", "worker"]);
	});

	it("should parse Links: key from info output", () => {
		const output = [
			"=====> store postgres service information",
			"       Links:               store-app",
		].join("\n");
		expect(parseLinkedApps(output)).toEqual(["store-app"]);
	});

	it("should return empty array when no linked apps", () => {
		const output = [
			"=====> PostgreSQL service store",
			"Linked Apps:No linked apps",
			"=====> Connection Info:",
		].join("\n");
		expect(parseLinkedApps(output)).toEqual([]);
	});

	it("should return empty array for empty output", () => {
		expect(parseLinkedApps("")).toEqual([]);
	});

	it("should stop collecting at =====> boundary", () => {
		const output = [
			"=====> main-db linked apps",
			"api",
			"=====> Connection Info:",
			"postgresql://main-db@localhost",
		].join("\n");
		expect(parseLinkedApps(output)).toEqual(["api"]);
	});

	it("should handle CRLF line endings", () => {
		const output = "=====> main-db linked apps\r\napi\r\nworker\r\n";
		const apps = parseLinkedApps(output);
		expect(apps).toContain("api");
		expect(apps).toContain("worker");
	});

	it("should parse Dokku 0.31.x links output with space-separated apps", () => {
		const output = "main-db linked apps: api worker frontend";
		expect(parseLinkedApps(output)).toEqual(["api", "worker", "frontend"]);
	});

	it("should return empty array for dash placeholder", () => {
		const output = "Linked Apps: -";
		expect(parseLinkedApps(output)).toEqual([]);
	});

	it("should handle mixed-case app names", () => {
		const output = "main-db linked apps: MyApp, WorkerService";
		expect(parseLinkedApps(output)).toEqual(["myapp", "workerservice"]);
	});
});
