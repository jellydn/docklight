import { describe, expect, it, vi } from "vitest";
import {
	collectAppMigrationInventory,
	formatAppMigrationReport,
	type InventoryCommandResult,
} from "./app-migration-inventory.js";

const COMMIT = "1234567890abcdef1234567890abcdef12345678";

function runner(
	overrides: Record<string, InventoryCommandResult> = {}
): ReturnType<typeof vi.fn<(args: string[]) => Promise<InventoryCommandResult>>> {
	const outputs: Record<string, string> = {
		"--quiet apps:list": "pilot\nconsumer\n",
		"config:keys pilot": "PORT\nSESSION_KEY\nPORT\n",
		"config:keys --global": "GLOBAL_MODE\n",
		"git:report pilot": `Git sha: ${COMMIT}\nGit source image: private-image:latest`,
		"plugin:list": "postgres 1.0.0 enabled\nredis 1.0.0 enabled",
		"--quiet postgres:list": "primary\nshared\nunrelated",
		"--quiet redis:list": "cache",
		"postgres:links primary": "=====> primary linked apps\npilot",
		"postgres:links shared": "pilot\nconsumer",
		"postgres:links unrelated": "consumer",
		"redis:links cache": "pilot",
	};
	return vi.fn(async (args: string[]): Promise<InventoryCommandResult> => {
		const key = args.join(" ");
		return overrides[key] ?? { exitCode: 0, stdout: outputs[key] ?? "Report present" };
	});
}

describe("app migration inventory", () => {
	it("collects one app and distinguishes dedicated, shared and unrelated services", async () => {
		const run = runner();
		const inventory = await collectAppMigrationInventory("pilot", run);
		expect(inventory).toMatchObject({
			version: "1.0",
			app: "pilot",
			phase: "inventory-only",
			readyForMigration: false,
			deploymentCommit: COMMIT,
			configKeys: { app: ["PORT", "SESSION_KEY"], global: ["GLOBAL_MODE"] },
		});
		expect(inventory.databaseLinks).toEqual([
			{ plugin: "postgres", service: "primary", apps: ["pilot"], shared: false },
			{ plugin: "postgres", service: "shared", apps: ["consumer", "pilot"], shared: true },
			{ plugin: "redis", service: "cache", apps: ["pilot"], shared: false },
		]);
		expect(inventory.blockers).toContain(
			"Shared postgres service shared: approve a dependency strategy."
		);
		expect(run.mock.calls.map(([args]) => args[0])).not.toContain("mysql:list");
	});

	it.each([
		"pilot;cleanup",
		"--global",
		"-pilot",
		"pilot-",
		"a".repeat(65),
	])("rejects invalid app %s before running commands", async (app) => {
		const run = runner();
		await expect(collectAppMigrationInventory(app, run)).rejects.toThrow("Invalid Dokku app name");
		expect(run).not.toHaveBeenCalled();
	});

	it("stops if the selected app cannot be verified", async () => {
		const run = runner({ "--quiet apps:list": { exitCode: 0, stdout: "consumer" } });
		const inventory = await collectAppMigrationInventory("pilot", run);
		expect(run).toHaveBeenCalledTimes(1);
		expect(inventory.observations).toEqual([{ section: "apps", status: "unknown" }]);
		expect(inventory.readyForMigration).toBe(false);
	});

	it("does not turn command failures, empty reports or malformed links into healthy state", async () => {
		const inventory = await collectAppMigrationInventory(
			"pilot",
			runner({
				"storage:list pilot": { exitCode: 1, stdout: "" },
				"certs:report pilot": { exitCode: 0, stdout: "" },
				"postgres:links shared": { exitCode: 0, stdout: "Links: unexpected-app" },
				"--quiet redis:list": { exitCode: 0, stdout: "table columns not recognized" },
			})
		);
		expect(inventory.observations).toEqual(
			expect.arrayContaining([
				{ section: "storage", status: "failed" },
				{ section: "certificates", status: "unknown" },
				{ section: "postgres/shared-links", status: "unknown" },
				{ section: "redis-services", status: "unknown" },
			])
		);
		expect(inventory.databaseLinks.map((link) => link.service)).toEqual(["primary"]);
		expect(inventory.readyForMigration).toBe(false);
	});

	it("rejects service names that could be interpreted as command options", async () => {
		const run = runner({ "--quiet postgres:list": { exitCode: 0, stdout: "--force" } });
		const inventory = await collectAppMigrationInventory("pilot", run);
		expect(inventory.observations).toContainEqual({
			section: "postgres-services",
			status: "unknown",
		});
		expect(run.mock.calls.some(([args]) => args.includes("--force"))).toBe(false);
	});

	it("uses only fixed read-only probes and never retrieves config values or database info", async () => {
		const run = runner();
		await collectAppMigrationInventory("pilot", run);
		const allowed = new Set([
			"apps:list",
			"config:keys",
			"version",
			"ps:report",
			"git:report",
			"builder:report",
			"buildpacks:report",
			"domains:report",
			"ports:report",
			"proxy:report",
			"checks:report",
			"network:report",
			"docker-options:report",
			"storage:list",
			"certs:report",
			"plugin:list",
			"postgres:list",
			"postgres:links",
			"redis:list",
			"redis:links",
		]);
		for (const [args] of run.mock.calls) {
			expect(allowed.has(args[0] === "--quiet" ? args[1] : args[0])).toBe(true);
		}
	});

	it("discards raw values and thrown errors from both manifest and report", async () => {
		const sensitive = ["do", "not", "publish"].join("-");
		const run = runner({
			"config:keys pilot": { exitCode: 0, stdout: `SESSION_KEY=${sensitive}` },
			"git:report pilot": {
				exitCode: 0,
				stdout: `Git sha: short\nURL: https://${sensitive}@example.invalid`,
			},
			"network:report pilot": { exitCode: 0, stdout: `Network: ${sensitive}` },
		});
		const inventory = await collectAppMigrationInventory("pilot", async (args) => {
			if (args[0] === "storage:list") throw new Error(sensitive);
			return run(args);
		});
		expect(JSON.stringify(inventory)).not.toContain(sensitive);
		expect(formatAppMigrationReport(inventory)).not.toContain(sensitive);
		expect(inventory.configKeys.app).toEqual([]);
		expect(inventory.deploymentCommit).toBeNull();
		expect(formatAppMigrationReport(inventory)).toContain("NOT ready for migration");
	});

	it("keeps manual dependency and recovery blockers even when every probe succeeds", async () => {
		const inventory = await collectAppMigrationInventory("pilot", runner());
		expect(inventory.blockers).toEqual(
			expect.arrayContaining([
				"Review all plugins, external services, cross-app calls and reverse dependencies.",
				"Review shared mounts, named volumes, external paths and data inside containers.",
				"Approve a tested backup, rehearsal, write freeze, DNS cutover and rollback procedure.",
			])
		);
		expect(inventory.readyForMigration).toBe(false);
	});
});
