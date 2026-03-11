import { executeCommand } from "./executor.js";
import { shellQuote } from "./shell.js";

export interface GitSyncResult {
	execCommand: string;
	displayCommand: string;
}

/**
 * Type definition for Dokku command builder functions.
 * Each command builder returns a complete shell command string.
 */
export interface DokkuCommands {
	// Version
	version(): string;

	// Apps
	appsList(): string;
	appsListQuiet(): string;
	appsCreate(name: string): string;
	appsDestroy(name: string): string;
	appsUnlock(name: string): string;
	appsLock(name: string): string;

	// Process management
	psReport(app: string): string;
	psRestart(app: string): string;
	psStop(app: string): string;
	psStart(app: string): string;
	psRebuild(app: string): string;
	psScale(app: string, processType: string, count: number): string;

	// Domains
	domainsReport(app: string): string;
	domainsAdd(app: string, domain: string): string;
	domainsRemove(app: string, domain: string): string;

	// Config
	configShow(app: string): string;
	configSet(app: string, key: string, value: string): string;
	configUnset(app: string, key: string): string;

	// Plugins (read-only)
	pluginList(): string;

	// Ports
	portsReport(app: string): string;
	portsAdd(app: string, scheme: string, hostPort: number, containerPort: number): string;
	portsRemove(app: string, scheme: string, hostPort: number, containerPort: number): string;
	portsClear(app: string): string;

	// Proxy
	proxyReport(app: string): string;
	proxyEnable(app: string): string;
	proxyDisable(app: string): string;

	// Buildpacks
	buildpacksReport(app: string): string;
	buildpacksAdd(app: string, url: string, index?: number): string;
	buildpacksRemove(app: string, url: string): string;
	buildpacksClear(app: string): string;

	// Deployment - git
	gitReport(app: string): string;
	gitSetDeployBranch(app: string, branch: string): string;
	gitSync(app: string, repo: string, branch?: string): GitSyncResult;

	// Deployment - builder
	builderReport(app: string): string;
	builderSetBuildDir(app: string, dir: string): string;
	builderClearBuildDir(app: string): string;
	builderSetSelected(app: string, builder: string): string;
	builderClearSelected(app: string): string;

	// SSL / Let's Encrypt
	letsencryptReport(app: string): string;
	letsencryptLs(): string;
	letsencryptSetEmail(app: string, email: string): string;
	letsencryptEnable(app: string): string;
	letsencryptAutoRenew(app: string): string;
	certsReport(app: string): string;

	// Network
	networkReport(app: string): string;
	networkSet(app: string, key: string, value?: string): string;

	// Docker options
	dockerOptionsReport(app: string): string;
	dockerOptionsAdd(app: string, phase: string, option: string): string;
	dockerOptionsRemove(app: string, phase: string, option: string): string;
	dockerOptionsClear(app: string, phase: string): string;

	// Database (dynamic plugin name)
	dbList(plugin: string): string;
	dbLinks(plugin: string, name: string): string;
	dbInfo(plugin: string, name: string): string;
	dbCreate(plugin: string, name: string): string;
	dbLink(plugin: string, name: string, app: string): string;
	dbUnlink(plugin: string, name: string, app: string): string;
	dbDestroy(plugin: string, name: string): string;

	// Checks (health checks)
	checksReport(app: string): string;
	checksEnable(app: string): string;
	checksDisable(app: string): string;
	checksSkip(app: string): string;
	checksRun(app: string): string;

	// Logs
	logsFollow(app: string, lines: number): string;
}

/**
 * Centralized Dokku CLI command builders.
 * All Dokku command strings are defined here to make version compatibility
 * changes easy to apply in a single location.
 */
export const DokkuCommands: DokkuCommands = {
	// Version
	version: (): string => "dokku version",

	// Apps
	appsList: (): string => "dokku apps:list",
	appsListQuiet: (): string => "dokku --quiet apps:list",
	appsCreate: (name: string): string => `dokku apps:create ${name}`,
	appsDestroy: (name: string): string => `dokku apps:destroy ${name} --force`,
	appsUnlock: (name: string): string => `dokku apps:unlock ${shellQuote(name)}`,
	appsLock: (name: string): string => `dokku apps:lock ${shellQuote(name)}`,

	// Process management
	psReport: (app: string): string => `dokku ps:report ${app}`,
	psRestart: (app: string): string => `dokku ps:restart ${app}`,
	psStop: (app: string): string => `dokku ps:stop ${app}`,
	psStart: (app: string): string => `dokku ps:start ${app}`,
	psRebuild: (app: string): string => `dokku ps:rebuild ${app}`,
	psScale: (app: string, processType: string, count: number): string =>
		`dokku ps:scale ${app} ${processType}=${count}`,

	// Domains
	domainsReport: (app: string): string => `dokku domains:report ${app}`,
	domainsAdd: (app: string, domain: string): string =>
		`dokku domains:add ${shellQuote(app)} ${shellQuote(domain)}`,
	domainsRemove: (app: string, domain: string): string =>
		`dokku domains:remove ${shellQuote(app)} ${shellQuote(domain)}`,

	// Config
	configShow: (app: string): string => `dokku config:show ${app}`,
	configSet: (app: string, key: string, value: string): string =>
		`dokku config:set ${shellQuote(app)} ${shellQuote(key)}=${shellQuote(value)}`,
	configUnset: (app: string, key: string): string =>
		`dokku config:unset ${shellQuote(app)} ${shellQuote(key)}`,

	// Plugins (read-only)
	pluginList: (): string => "dokku plugin:list",

	// Ports
	portsReport: (app: string): string => `dokku ports:report ${app}`,
	portsAdd: (app: string, scheme: string, hostPort: number, containerPort: number): string =>
		`dokku ports:add ${shellQuote(app)} ${scheme}:${hostPort}:${containerPort}`,
	portsRemove: (app: string, scheme: string, hostPort: number, containerPort: number): string =>
		`dokku ports:remove ${shellQuote(app)} ${scheme}:${hostPort}:${containerPort}`,
	portsClear: (app: string): string => `dokku ports:clear ${shellQuote(app)}`,

	// Proxy
	proxyReport: (app: string): string => `dokku proxy:report ${app}`,
	proxyEnable: (app: string): string => `dokku proxy:enable ${app}`,
	proxyDisable: (app: string): string => `dokku proxy:disable ${app}`,

	// Buildpacks
	buildpacksReport: (app: string): string => `dokku buildpacks:report ${app}`,
	buildpacksAdd: (app: string, url: string, index?: number): string =>
		// Buildpack index is 1-based, so 0 is invalid and should be treated as undefined
		index !== undefined && index > 0
			? `dokku buildpacks:add ${shellQuote(app)} --index ${index} ${shellQuote(url)}`
			: `dokku buildpacks:add ${shellQuote(app)} ${shellQuote(url)}`,
	buildpacksRemove: (app: string, url: string): string =>
		`dokku buildpacks:remove ${shellQuote(app)} ${shellQuote(url)}`,
	buildpacksClear: (app: string): string => `dokku buildpacks:clear ${shellQuote(app)}`,

	// Deployment - git
	gitReport: (app: string): string => `dokku git:report ${app}`,
	gitSetDeployBranch: (app: string, branch: string): string =>
		`dokku git:set ${shellQuote(app)} deploy-branch ${shellQuote(branch)}`,
	gitSync: (app: string, repo: string, branch?: string): GitSyncResult => {
		const sanitizeRepoForDisplay = (url: string): string => {
			try {
				const urlObj = new URL(url);
				if (urlObj.username || urlObj.password) {
					urlObj.username = "[REDACTED]";
					urlObj.password = "[REDACTED]";
					return urlObj.toString();
				}
				return url;
			} catch {
				return url.replace(/\/\/[^@]+@/, "//[REDACTED]@");
			}
		};
		const displayRepo = sanitizeRepoForDisplay(repo);
		const execCmd = branch
			? `dokku git:sync --build ${shellQuote(app)} ${shellQuote(repo)} ${shellQuote(branch)}`
			: `dokku git:sync --build ${shellQuote(app)} ${shellQuote(repo)}`;
		const displayCmd = branch
			? `dokku git:sync --build ${shellQuote(app)} ${shellQuote(displayRepo)} ${shellQuote(branch)}`
			: `dokku git:sync --build ${shellQuote(app)} ${shellQuote(displayRepo)}`;
		return { execCommand: execCmd, displayCommand: displayCmd };
	},

	// Deployment - builder
	builderReport: (app: string): string => `dokku builder:report ${app}`,
	builderSetBuildDir: (app: string, dir: string): string =>
		`dokku builder:set ${shellQuote(app)} build-dir ${shellQuote(dir)}`,
	builderClearBuildDir: (app: string): string => `dokku builder:set ${shellQuote(app)} build-dir`,
	builderSetSelected: (app: string, builder: string): string =>
		`dokku builder:set ${shellQuote(app)} selected ${shellQuote(builder)}`,
	builderClearSelected: (app: string): string => `dokku builder:set ${shellQuote(app)} selected`,

	// SSL / Let's Encrypt
	letsencryptReport: (app: string): string => `dokku letsencrypt:report ${app}`,
	letsencryptLs: (): string => "dokku letsencrypt:ls",
	letsencryptSetEmail: (app: string, email: string): string =>
		`dokku letsencrypt:set ${shellQuote(app)} email ${shellQuote(email)}`,
	letsencryptEnable: (app: string): string => `dokku letsencrypt:enable ${app}`,
	letsencryptAutoRenew: (app: string): string => `dokku letsencrypt:auto-renew ${app}`,
	certsReport: (app: string): string => `dokku certs:report ${app}`,

	// Network
	networkReport: (app: string): string => `dokku network:report ${app}`,
	networkSet: (app: string, key: string, value?: string): string =>
		value !== undefined
			? `dokku network:set ${shellQuote(app)} ${shellQuote(key)} ${shellQuote(value)}`
			: `dokku network:set ${shellQuote(app)} ${shellQuote(key)}`,

	// Docker options
	dockerOptionsReport: (app: string): string => `dokku docker-options:report ${app}`,
	dockerOptionsAdd: (app: string, phase: string, option: string): string =>
		`dokku docker-options:add ${shellQuote(app)} ${shellQuote(phase)} ${shellQuote(option)}`,
	dockerOptionsRemove: (app: string, phase: string, option: string): string =>
		`dokku docker-options:remove ${shellQuote(app)} ${shellQuote(phase)} ${shellQuote(option)}`,
	dockerOptionsClear: (app: string, phase: string): string =>
		`dokku docker-options:clear ${shellQuote(app)} ${shellQuote(phase)}`,

	// Database (dynamic plugin name)
	dbList: (plugin: string): string => `dokku ${plugin}:list`,
	dbLinks: (plugin: string, name: string): string => `dokku ${plugin}:links ${shellQuote(name)}`,
	dbInfo: (plugin: string, name: string): string => `dokku ${plugin}:info ${shellQuote(name)}`,
	dbCreate: (plugin: string, name: string): string => `dokku ${plugin}:create ${shellQuote(name)}`,
	dbLink: (plugin: string, name: string, app: string): string =>
		`dokku ${plugin}:link ${shellQuote(name)} ${shellQuote(app)}`,
	dbUnlink: (plugin: string, name: string, app: string): string =>
		`dokku ${plugin}:unlink ${shellQuote(name)} ${shellQuote(app)}`,
	dbDestroy: (plugin: string, name: string): string =>
		`dokku ${plugin}:destroy ${shellQuote(name)} --force`,

	// Checks (health checks)
	checksReport: (app: string): string => `dokku checks:report ${shellQuote(app)}`,
	checksEnable: (app: string): string => `dokku checks:enable ${shellQuote(app)}`,
	checksDisable: (app: string): string => `dokku checks:disable ${shellQuote(app)}`,
	checksSkip: (app: string): string => `dokku checks:skip ${shellQuote(app)}`,
	checksRun: (app: string): string => `dokku checks:run ${shellQuote(app)}`,

	// Logs
	logsFollow: (app: string, lines: number): string =>
		`dokku logs ${shellQuote(app)} -t -n ${lines}`,
};

/**
 * Detects the installed Dokku version by running `dokku version`.
 * Returns the version string (e.g. "0.34.5") or null if detection fails.
 */
export async function getDokkuVersion(): Promise<string | null> {
	const result = await executeCommand(DokkuCommands.version());
	if (result.exitCode !== 0 || !result.stdout) {
		return null;
	}
	return parseDokkuVersion(result.stdout);
}

/**
 * Parses a Dokku version string from the output of `dokku version`.
 * Accepts formats like "dokku version 0.34.5" or just "0.34.5".
 */
export function parseDokkuVersion(output: string): string | null {
	const match = output.match(/(\d+\.\d+\.\d+)/);
	return match ? match[1] : null;
}
