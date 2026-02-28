import { executeCommand } from "./executor.js";
import { shellQuote } from "./shell.js";

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

	// Plugins
	pluginList(): string;
	pluginInstall(repo: string, name?: string): string;
	pluginUninstall(name: string): string;
	pluginEnable(name: string): string;
	pluginDisable(name: string): string;

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
	dbCreate(plugin: string, name: string): string;
	dbLink(plugin: string, name: string, app: string): string;
	dbUnlink(plugin: string, name: string, app: string): string;
	dbDestroy(plugin: string, name: string): string;

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
	version: () => "dokku version",

	// Apps
	appsList: () => "dokku apps:list",
	appsListQuiet: () => "dokku --quiet apps:list",
	appsCreate: (name: string) => `dokku apps:create ${name}`,
	appsDestroy: (name: string) => `dokku apps:destroy ${name} --force`,

	// Process management
	psReport: (app: string) => `dokku ps:report ${app}`,
	psRestart: (app: string) => `dokku ps:restart ${app}`,
	psStop: (app: string) => `dokku ps:stop ${app}`,
	psStart: (app: string) => `dokku ps:start ${app}`,
	psRebuild: (app: string) => `dokku ps:rebuild ${app}`,
	psScale: (app: string, processType: string, count: number) =>
		`dokku ps:scale ${app} ${processType}=${count}`,

	// Domains
	domainsReport: (app: string) => `dokku domains:report ${app}`,
	domainsAdd: (app: string, domain: string) =>
		`dokku domains:add ${shellQuote(app)} ${shellQuote(domain)}`,
	domainsRemove: (app: string, domain: string) =>
		`dokku domains:remove ${shellQuote(app)} ${shellQuote(domain)}`,

	// Config
	configShow: (app: string) => `dokku config:show ${app}`,
	configSet: (app: string, key: string, value: string) =>
		`dokku config:set ${shellQuote(app)} ${shellQuote(key)}=${shellQuote(value)}`,
	configUnset: (app: string, key: string) => `dokku config:unset ${app} ${key}`,

	// Plugins
	pluginList: () => "dokku plugin:list",
	pluginInstall: (repo: string, name?: string) =>
		name ? `dokku plugin:install ${repo} ${name}` : `dokku plugin:install ${repo}`,
	pluginUninstall: (name: string) => `dokku plugin:uninstall ${name}`,
	pluginEnable: (name: string) => `dokku plugin:enable ${name}`,
	pluginDisable: (name: string) => `dokku plugin:disable ${name}`,

	// Ports
	portsReport: (app: string) => `dokku ports:report ${app}`,
	portsAdd: (app: string, scheme: string, hostPort: number, containerPort: number) =>
		`dokku ports:add ${app} ${scheme}:${hostPort}:${containerPort}`,
	portsRemove: (app: string, scheme: string, hostPort: number, containerPort: number) =>
		`dokku ports:remove ${app} ${scheme}:${hostPort}:${containerPort}`,
	portsClear: (app: string) => `dokku ports:clear ${app}`,

	// Proxy
	proxyReport: (app: string) => `dokku proxy:report ${app}`,
	proxyEnable: (app: string) => `dokku proxy:enable ${app}`,
	proxyDisable: (app: string) => `dokku proxy:disable ${app}`,

	// Buildpacks
	buildpacksReport: (app: string) => `dokku buildpacks:report ${app}`,
	buildpacksAdd: (app: string, url: string, index?: number) =>
		// Buildpack index is 1-based, so 0 is invalid and should be treated as undefined
		index !== undefined && index > 0
			? `dokku buildpacks:add ${shellQuote(app)} --index ${index} ${shellQuote(url)}`
			: `dokku buildpacks:add ${shellQuote(app)} ${shellQuote(url)}`,
	buildpacksRemove: (app: string, url: string) =>
		`dokku buildpacks:remove ${shellQuote(app)} ${shellQuote(url)}`,
	buildpacksClear: (app: string) => `dokku buildpacks:clear ${shellQuote(app)}`,

	// Deployment - git
	gitReport: (app: string) => `dokku git:report ${app}`,
	gitSetDeployBranch: (app: string, branch: string) =>
		`dokku git:set ${shellQuote(app)} deploy-branch ${shellQuote(branch)}`,

	// Deployment - builder
	builderReport: (app: string) => `dokku builder:report ${app}`,
	builderSetBuildDir: (app: string, dir: string) =>
		`dokku builder:set ${shellQuote(app)} build-dir ${shellQuote(dir)}`,
	builderClearBuildDir: (app: string) => `dokku builder:set ${shellQuote(app)} build-dir`,
	builderSetSelected: (app: string, builder: string) =>
		`dokku builder:set ${shellQuote(app)} selected ${shellQuote(builder)}`,
	builderClearSelected: (app: string) => `dokku builder:set ${shellQuote(app)} selected`,

	// SSL / Let's Encrypt
	letsencryptReport: (app: string) => `dokku letsencrypt:report ${app}`,
	letsencryptLs: () => "dokku letsencrypt:ls",
	letsencryptSetEmail: (app: string, email: string) =>
		`dokku letsencrypt:set ${shellQuote(app)} email ${shellQuote(email)}`,
	letsencryptEnable: (app: string) => `dokku letsencrypt:enable ${app}`,
	letsencryptAutoRenew: (app: string) => `dokku letsencrypt:auto-renew ${app}`,
	certsReport: (app: string) => `dokku certs:report ${app}`,

	// Network
	networkReport: (app: string) => `dokku network:report ${app}`,
	networkSet: (app: string, key: string, value?: string) =>
		value !== undefined
			? `dokku network:set ${shellQuote(app)} ${shellQuote(key)} ${shellQuote(value)}`
			: `dokku network:set ${shellQuote(app)} ${shellQuote(key)}`,

	// Docker options
	dockerOptionsReport: (app: string) => `dokku docker-options:report ${app}`,
	dockerOptionsAdd: (app: string, phase: string, option: string) =>
		`dokku docker-options:add ${shellQuote(app)} ${shellQuote(phase)} ${shellQuote(option)}`,
	dockerOptionsRemove: (app: string, phase: string, option: string) =>
		`dokku docker-options:remove ${shellQuote(app)} ${shellQuote(phase)} ${shellQuote(option)}`,
	dockerOptionsClear: (app: string, phase: string) =>
		`dokku docker-options:clear ${shellQuote(app)} ${shellQuote(phase)}`,

	// Database (dynamic plugin name)
	dbList: (plugin: string) => `dokku ${plugin}:list`,
	dbLinks: (plugin: string, name: string) => `dokku ${plugin}:links ${name}`,
	dbCreate: (plugin: string, name: string) => `dokku ${plugin}:create ${name}`,
	dbLink: (plugin: string, name: string, app: string) => `dokku ${plugin}:link ${name} ${app}`,
	dbUnlink: (plugin: string, name: string, app: string) => `dokku ${plugin}:unlink ${name} ${app}`,
	dbDestroy: (plugin: string, name: string) => `dokku ${plugin}:destroy ${name} --force`,

	// Logs
	logsFollow: (app: string, lines: number) => `dokku logs ${shellQuote(app)} -t -n ${lines}`,
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
