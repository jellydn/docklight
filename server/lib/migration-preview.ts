import { isValidAppName } from "./app-name.js";
import { stripAnsi } from "./ansi.js";
import { collectAppMigrationInventory } from "./app-migration-inventory.js";
import {
	destinationEndpoint,
	destinationSummary,
	sourceEndpoint,
	withMigrationConnection,
} from "./migration-connection.js";

export interface MigrationPreview {
	app: string;
	destinationRevision: string;
	readyForSync: false;
	configKeyCount: number;
	databaseServiceCount: number;
	sharedServiceCount: number;
	failedChecks: number;
	blockers: string[];
}

function parseAppList(output: string): string[] {
	const apps = stripAnsi(output)
		.split("\n")
		.map((name) => name.trim())
		.filter(Boolean);
	if (apps.length > 1000 || apps.some((name) => !isValidAppName(name)))
		throw new Error("App list was not recognized.");
	return [...new Set(apps)].sort();
}

export async function listMigrationApps(signal: AbortSignal): Promise<string[]> {
	return withMigrationConnection(sourceEndpoint(), signal, async (connection) => {
		const output = await connection.command(["dokku", "--quiet", "apps:list"]);
		return parseAppList(output);
	});
}

export async function previewMigrationApp(
	app: unknown,
	revision: unknown,
	signal: AbortSignal
): Promise<MigrationPreview> {
	if (typeof app !== "string" || !isValidAppName(app)) throw new Error("Invalid app selection.");
	const summary = destinationSummary();
	if (!summary.revision || revision !== summary.revision)
		throw new Error("Destination changed. Refresh the preview.");
	const destination = destinationEndpoint();
	const inventory = await withMigrationConnection(sourceEndpoint(), signal, async (connection) =>
		collectAppMigrationInventory(app, async (args) => {
			const stdout = await connection.command(["dokku", ...args]);
			if (stdout.split("\n").length > 1000) throw new Error("Inventory size limit exceeded.");
			return { exitCode: 0, stdout };
		})
	);
	const collision = await withMigrationConnection(destination, signal, async (connection) => {
		await connection.command(["dokku", "version"]);
		const output = await connection.command(["dokku", "--quiet", "apps:list"]);
		return parseAppList(output).includes(app);
	});
	signal.throwIfAborted();
	if (destinationSummary().revision !== revision)
		throw new Error("Destination changed. Refresh the preview.");
	const sharedServiceCount = inventory.databaseLinks.filter((link) => link.shared).length;
	const failedChecks = inventory.observations.filter((item) => item.status !== "observed").length;
	return {
		app,
		destinationRevision: summary.revision,
		readyForSync: false,
		configKeyCount: inventory.configKeys.app.length + inventory.configKeys.global.length,
		databaseServiceCount: inventory.databaseLinks.length,
		sharedServiceCount,
		failedChecks,
		blockers: [
			...(collision
				? ["An app with this name already exists at the destination. Do not overwrite it."]
				: []),
			...(sharedServiceCount
				? ["Shared database services require an approved dependency strategy."]
				: []),
			...(failedChecks ? ["Some source inventory checks failed or were not recognized."] : []),
			"Sync is not implemented. Config-only copies are not a complete app migration.",
			"Verify disk bytes/inodes, versions, backup capacity and source health.",
			"Review volumes, database consistency, shared writers and cross-app dependencies securely.",
			"Approve a backup/restore rehearsal, temporary hostname, write freeze and rollback procedure.",
		],
	};
}
