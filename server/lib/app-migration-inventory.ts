import { isValidAppName } from "./app-name.js";
import { stripAnsi } from "./ansi.js";
import { SUPPORTED_PLUGINS } from "./database-plugins.js";

export interface InventoryCommandResult {
	exitCode: number;
	stdout: string;
}

export type InventoryRunner = (args: string[]) => Promise<InventoryCommandResult>;
export type InventoryStatus = "observed" | "failed" | "unknown";

export interface InventoryObservation {
	section: string;
	status: InventoryStatus;
}

export interface MigrationDatabaseLink {
	plugin: string;
	service: string;
	apps: string[];
	shared: boolean;
}

export interface AppMigrationInventory {
	version: "1.0";
	app: string;
	phase: "inventory-only";
	readyForMigration: false;
	deploymentCommit: string | null;
	configKeys: { app: string[]; global: string[] };
	databaseLinks: MigrationDatabaseLink[];
	observations: InventoryObservation[];
	blockers: string[];
}

const APP_REPORTS = [
	["processes", "ps:report"],
	["deployment", "git:report"],
	["builder", "builder:report"],
	["buildpacks", "buildpacks:report"],
	["domains", "domains:report"],
	["ports", "ports:report"],
	["proxy", "proxy:report"],
	["checks", "checks:report"],
	["network", "network:report"],
	["docker-options", "docker-options:report"],
	["storage", "storage:list"],
	["certificates", "certs:report"],
] as const;

const MANUAL_BLOCKERS = [
	"Confirm host identity, versions, disk bytes/inodes and destination capacity.",
	"Review exact deployment source, app/global config values, domains, ports and TLS securely.",
	"Review all plugins, external services, cross-app calls and reverse dependencies.",
	"Review shared mounts, named volumes, external paths and data inside containers.",
	"Review database versions, aliases, all writers, queues and backup/restore semantics.",
	"Review cron, workers, release hooks and external side effects.",
	"Approve a tested backup, rehearsal, write freeze, DNS cutover and rollback procedure.",
];

function lines(stdout: string): string[] {
	return stripAnsi(stdout)
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line && !/^(=====>|----)/.test(line));
}

function parseNames(stdout: string, valid: (name: string) => boolean): string[] | null {
	const names = lines(stdout);
	return names.every(valid) ? [...new Set(names)].sort() : null;
}

export async function collectAppMigrationInventory(
	app: string,
	run: InventoryRunner
): Promise<AppMigrationInventory> {
	if (!isValidAppName(app)) throw new Error("Invalid Dokku app name");

	const inventory: AppMigrationInventory = {
		version: "1.0",
		app,
		phase: "inventory-only",
		readyForMigration: false,
		deploymentCommit: null,
		configKeys: { app: [], global: [] },
		databaseLinks: [],
		observations: [],
		blockers: [...MANUAL_BLOCKERS],
	};

	async function probe(section: string, args: string[]): Promise<string | null> {
		let result: InventoryCommandResult;
		try {
			result = await run(args);
		} catch {
			result = { exitCode: 1, stdout: "" };
		}
		const status = result.exitCode === 0 ? "observed" : "failed";
		inventory.observations.push({ section, status });
		if (status === "failed") {
			inventory.blockers.push(`Could not collect ${section}; inspect it securely on the host.`);
			return null;
		}
		return stripAnsi(result.stdout);
	}

	function unknown(section: string): void {
		const observation = inventory.observations.find((item) => item.section === section);
		if (observation) observation.status = "unknown";
		inventory.blockers.push(`Unrecognized ${section}; verify it manually.`);
	}

	const appsOutput = await probe("apps", ["--quiet", "apps:list"]);
	const apps = appsOutput === null ? null : parseNames(appsOutput, isValidAppName);
	if (!apps?.includes(app)) {
		if (appsOutput !== null) unknown("apps");
		inventory.blockers.push("Selected app was not verified in the source app list.");
		return inventory;
	}

	for (const scope of ["app", "global"] as const) {
		const section = `${scope}-config-keys`;
		const output = await probe(section, ["config:keys", scope === "app" ? app : "--global"]);
		if (output === null) continue;
		const keys = parseNames(output, (key) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key));
		if (keys === null) unknown(section);
		else inventory.configKeys[scope] = keys;
	}

	await probe("dokku-version", ["version"]);
	for (const [section, command] of APP_REPORTS) {
		const output = await probe(section, [command, app]);
		if (output === null) continue;
		if (!output.trim()) unknown(section);
		if (section === "deployment") {
			const commit = output.match(/^\s*Git sha:\s*([a-f0-9]{40}|[a-f0-9]{64})\s*$/im)?.[1];
			inventory.deploymentCommit = commit?.toLowerCase() ?? null;
		}
	}
	if (!inventory.deploymentCommit) {
		inventory.blockers.push(
			"No full Git commit observed; verify a reproducible commit or image digest."
		);
	}

	const pluginsOutput = await probe("plugins", ["plugin:list"]);
	if (pluginsOutput === null) return inventory;
	const pluginNames = lines(pluginsOutput).map((line) => line.split(/\s+/)[0]);
	if (pluginNames.length === 0) unknown("plugins");
	for (const plugin of SUPPORTED_PLUGINS) {
		if (!pluginNames.includes(plugin) && !pluginNames.includes(`dokku-${plugin}`)) continue;
		const section = `${plugin}-services`;
		const output = await probe(section, ["--quiet", `${plugin}:list`]);
		if (output === null) continue;
		const services = parseNames(output, (name) => /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name));
		if (services === null) {
			unknown(section);
			continue;
		}
		for (const service of services) {
			const linkSection = `${plugin}/${service}-links`;
			const linksOutput = await probe(linkSection, [`${plugin}:links`, service]);
			if (linksOutput === null) continue;
			const linked = parseNames(linksOutput, (name) => apps.includes(name));
			if (linked === null) {
				unknown(linkSection);
				continue;
			}
			if (!linked.includes(app)) continue;
			const shared = linked.length > 1;
			inventory.databaseLinks.push({ plugin, service, apps: linked, shared });
			if (shared) {
				inventory.blockers.push(
					`Shared ${plugin} service ${service}: approve a dependency strategy.`
				);
			}
		}
	}
	return inventory;
}

export function formatAppMigrationReport(inventory: AppMigrationInventory): string {
	return [
		`App: ${inventory.app}`,
		"Phase: inventory-only (NOT ready for migration)",
		`Deployment commit: ${inventory.deploymentCommit ?? "unknown"}`,
		`Config keys: ${inventory.configKeys.app.length} app, ${inventory.configKeys.global.length} global`,
		`Linked database services observed: ${inventory.databaseLinks.length}`,
		"",
		"Observations (command success is not proof of complete inventory):",
		...inventory.observations.map((item) => `- ${item.section}: ${item.status}`),
		"",
		"Blockers:",
		...inventory.blockers.map((blocker) => `- ${blocker}`),
		"",
		"Raw values, addresses, paths, command output and secrets are not included.",
	].join("\n");
}
