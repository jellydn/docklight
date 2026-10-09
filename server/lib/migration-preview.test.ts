import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectAppMigrationInventory } from "./app-migration-inventory.js";
import { destinationSummary, withMigrationConnection } from "./migration-connection.js";
import { listMigrationApps, previewMigrationApp } from "./migration-preview.js";

vi.mock("./migration-connection.js", () => ({
	sourceEndpoint: vi.fn(() => ({})),
	destinationEndpoint: vi.fn(() => ({})),
	destinationSummary: vi.fn(),
	withMigrationConnection: vi.fn(),
}));
vi.mock("./app-migration-inventory.js", () => ({ collectAppMigrationInventory: vi.fn() }));
const command = vi.fn();
const signal = new AbortController().signal;

describe("sanitized migration preview", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(destinationSummary).mockReturnValue({
			configured: true,
			sourceConfigured: true,
			revision: "revision",
		});
		vi.mocked(withMigrationConnection).mockImplementation(async (_profile, _signal, work) =>
			work({ command } as never)
		);
		command.mockResolvedValue("pilot\n");
		vi.mocked(collectAppMigrationInventory).mockResolvedValue({
			version: "1.0",
			app: "pilot",
			phase: "inventory-only",
			readyForMigration: false,
			deploymentCommit: null,
			configKeys: { app: ["PASSWORD"], global: [] },
			databaseLinks: [
				{ plugin: "postgres", service: "private-service", apps: ["pilot", "other"], shared: true },
			],
			observations: [{ section: "private-service-links", status: "failed" }],
			blockers: ["private raw value destination.invalid"],
		});
	});
	it("returns counts and fixed blockers, not raw identifiers, hosts or config keys", async () => {
		const result = await previewMigrationApp("pilot", "revision", signal);
		expect(result).toMatchObject({
			readyForSync: false,
			configKeyCount: 1,
			databaseServiceCount: 1,
			sharedServiceCount: 1,
			failedChecks: 1,
		});
		expect(result.blockers).toContain(
			"An app with this name already exists at the destination. Do not overwrite it."
		);
		expect(JSON.stringify(result)).not.toMatch(
			/PASSWORD|private-service|destination.invalid|private raw/
		);
	});
	it("rejects injection and stale revisions before any connection", async () => {
		await expect(previewMigrationApp("pilot;id", "revision", signal)).rejects.toThrow(
			"Invalid app"
		);
		await expect(previewMigrationApp("pilot", "old", signal)).rejects.toThrow(
			"Destination changed"
		);
		expect(withMigrationConnection).not.toHaveBeenCalled();
	});
	it("rejects a destination change while a preview runs", async () => {
		vi.mocked(destinationSummary)
			.mockReturnValueOnce({ configured: true, sourceConfigured: true, revision: "revision" })
			.mockReturnValue({ configured: true, sourceConfigured: true, revision: "new" });
		await expect(previewMigrationApp("pilot", "revision", signal)).rejects.toThrow(
			"Destination changed"
		);
	});
	it("accepts only bounded valid app names, with no raw diagnostics", async () => {
		command.mockResolvedValue("second\npilot\nsecond\n");
		await expect(listMigrationApps(signal)).resolves.toEqual(["pilot", "second"]);
		command.mockResolvedValue("private host.invalid\n");
		await expect(listMigrationApps(signal)).rejects.toThrow();
	});
});
