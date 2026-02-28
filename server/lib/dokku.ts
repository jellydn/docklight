import { executeCommand } from "./executor.js";
import { shellQuote } from "./shell.js";

/**
 * Centralized Dokku CLI command builders.
 * All Dokku command strings are defined here to make version compatibility
 * changes easy to apply in a single location.
 */
export const DokkuCommands = {
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
	domainsAdd: (app: string, domain: string) => `dokku domains:add ${app} ${domain}`,
	domainsRemove: (app: string, domain: string) => `dokku domains:remove ${app} ${domain}`,

	// Config
	configShow: (app: string) => `dokku config:show ${app}`,
	configSet: (app: string, key: string, value: string) =>
		`dokku config:set ${app} ${key}='${value}'`,
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
		`dokku letsencrypt:set ${app} email ${email}`,
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
	dbUnlink: (plugin: string, name: string, app: string) =>
		`dokku ${plugin}:unlink ${name} ${app}`,
	dbDestroy: (plugin: string, name: string) => `dokku ${plugin}:destroy ${name} --force`,

	// Logs
	logsFollow: (app: string, lines: number) => `dokku logs ${app} -t -n ${lines}`,
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
