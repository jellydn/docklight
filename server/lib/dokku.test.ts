import { describe, it, expect, vi, beforeEach } from "vitest";
import { DokkuCommands, getDokkuVersion, parseDokkuVersion } from "./dokku.js";
import { executeCommand } from "./executor.js";

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

describe("DokkuCommands", () => {
	describe("version", () => {
		it("returns version command", () => {
			expect(DokkuCommands.version()).toBe("dokku version");
		});
	});

	describe("apps", () => {
		it("appsList returns apps:list command", () => {
			expect(DokkuCommands.appsList()).toBe("dokku apps:list");
		});

		it("appsListQuiet returns quiet apps:list command", () => {
			expect(DokkuCommands.appsListQuiet()).toBe("dokku --quiet apps:list");
		});

		it("appsCreate returns create command with app name", () => {
			expect(DokkuCommands.appsCreate("my-app")).toBe("dokku apps:create my-app");
		});

		it("appsDestroy returns destroy command with --force flag", () => {
			expect(DokkuCommands.appsDestroy("my-app")).toBe("dokku apps:destroy my-app --force");
		});
	});

	describe("process management", () => {
		it("psReport returns ps:report command", () => {
			expect(DokkuCommands.psReport("my-app")).toBe("dokku ps:report my-app");
		});

		it("psRestart returns ps:restart command", () => {
			expect(DokkuCommands.psRestart("my-app")).toBe("dokku ps:restart my-app");
		});

		it("psStop returns ps:stop command", () => {
			expect(DokkuCommands.psStop("my-app")).toBe("dokku ps:stop my-app");
		});

		it("psStart returns ps:start command", () => {
			expect(DokkuCommands.psStart("my-app")).toBe("dokku ps:start my-app");
		});

		it("psRebuild returns ps:rebuild command", () => {
			expect(DokkuCommands.psRebuild("my-app")).toBe("dokku ps:rebuild my-app");
		});

		it("psScale returns ps:scale command with process=count format", () => {
			expect(DokkuCommands.psScale("my-app", "web", 3)).toBe("dokku ps:scale my-app web=3");
		});
	});

	describe("domains", () => {
		it("domainsReport returns domains:report command", () => {
			expect(DokkuCommands.domainsReport("my-app")).toBe("dokku domains:report my-app");
		});

		it("domainsAdd returns domains:add command", () => {
			expect(DokkuCommands.domainsAdd("my-app", "example.com")).toBe(
				"dokku domains:add 'my-app' 'example.com'"
			);
		});

		it("domainsRemove returns domains:remove command", () => {
			expect(DokkuCommands.domainsRemove("my-app", "example.com")).toBe(
				"dokku domains:remove 'my-app' 'example.com'"
			);
		});
	});

	describe("config", () => {
		it("configShow returns config:show command", () => {
			expect(DokkuCommands.configShow("my-app")).toBe("dokku config:show my-app");
		});

		it("configSet returns config:set command with quoted value", () => {
			expect(DokkuCommands.configSet("my-app", "KEY", "value")).toBe(
				"dokku config:set 'my-app' 'KEY'='value'"
			);
		});

		it("configUnset returns config:unset command", () => {
			expect(DokkuCommands.configUnset("my-app", "KEY")).toBe("dokku config:unset my-app KEY");
		});
	});

	describe("plugins", () => {
		it("pluginList returns plugin:list command", () => {
			expect(DokkuCommands.pluginList()).toBe("dokku plugin:list");
		});

		it("pluginInstall returns plugin:install command without name", () => {
			expect(DokkuCommands.pluginInstall("https://github.com/dokku/dokku-postgres.git")).toBe(
				"dokku plugin:install https://github.com/dokku/dokku-postgres.git"
			);
		});

		it("pluginInstall returns plugin:install command with name", () => {
			expect(
				DokkuCommands.pluginInstall("https://github.com/dokku/dokku-postgres.git", "postgres")
			).toBe("dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres");
		});

		it("pluginUninstall returns plugin:uninstall command", () => {
			expect(DokkuCommands.pluginUninstall("postgres")).toBe("dokku plugin:uninstall postgres");
		});

		it("pluginEnable returns plugin:enable command", () => {
			expect(DokkuCommands.pluginEnable("postgres")).toBe("dokku plugin:enable postgres");
		});

		it("pluginDisable returns plugin:disable command", () => {
			expect(DokkuCommands.pluginDisable("postgres")).toBe("dokku plugin:disable postgres");
		});
	});

	describe("ports and proxy", () => {
		it("portsReport returns ports:report command", () => {
			expect(DokkuCommands.portsReport("my-app")).toBe("dokku ports:report my-app");
		});

		it("portsAdd returns ports:add command", () => {
			expect(DokkuCommands.portsAdd("my-app", "http", 80, 5000)).toBe(
				"dokku ports:add my-app http:80:5000"
			);
		});

		it("portsRemove returns ports:remove command", () => {
			expect(DokkuCommands.portsRemove("my-app", "http", 80, 5000)).toBe(
				"dokku ports:remove my-app http:80:5000"
			);
		});

		it("portsClear returns ports:clear command", () => {
			expect(DokkuCommands.portsClear("my-app")).toBe("dokku ports:clear my-app");
		});

		it("proxyReport returns proxy:report command", () => {
			expect(DokkuCommands.proxyReport("my-app")).toBe("dokku proxy:report my-app");
		});

		it("proxyEnable returns proxy:enable command", () => {
			expect(DokkuCommands.proxyEnable("my-app")).toBe("dokku proxy:enable my-app");
		});

		it("proxyDisable returns proxy:disable command", () => {
			expect(DokkuCommands.proxyDisable("my-app")).toBe("dokku proxy:disable my-app");
		});
	});

	describe("buildpacks", () => {
		it("buildpacksReport returns buildpacks:report command", () => {
			expect(DokkuCommands.buildpacksReport("my-app")).toBe("dokku buildpacks:report my-app");
		});

		it("buildpacksAdd returns buildpacks:add command with shell-quoted args", () => {
			expect(DokkuCommands.buildpacksAdd("my-app", "https://example.com/buildpack.git")).toBe(
				"dokku buildpacks:add 'my-app' 'https://example.com/buildpack.git'"
			);
		});

		it("buildpacksAdd returns buildpacks:add command with index when specified", () => {
			expect(DokkuCommands.buildpacksAdd("my-app", "https://example.com/buildpack.git", 2)).toBe(
				"dokku buildpacks:add 'my-app' --index 2 'https://example.com/buildpack.git'"
			);
		});

		it("buildpacksRemove returns buildpacks:remove command with shell-quoted args", () => {
			expect(DokkuCommands.buildpacksRemove("my-app", "https://example.com/buildpack.git")).toBe(
				"dokku buildpacks:remove 'my-app' 'https://example.com/buildpack.git'"
			);
		});

		it("buildpacksClear returns buildpacks:clear command with shell-quoted app", () => {
			expect(DokkuCommands.buildpacksClear("my-app")).toBe("dokku buildpacks:clear 'my-app'");
		});
	});

	describe("deployment", () => {
		it("gitReport returns git:report command", () => {
			expect(DokkuCommands.gitReport("my-app")).toBe("dokku git:report my-app");
		});

		it("gitSetDeployBranch returns git:set deploy-branch command", () => {
			expect(DokkuCommands.gitSetDeployBranch("my-app", "main")).toBe(
				"dokku git:set 'my-app' deploy-branch 'main'"
			);
		});

		it("builderReport returns builder:report command", () => {
			expect(DokkuCommands.builderReport("my-app")).toBe("dokku builder:report my-app");
		});

		it("builderSetBuildDir returns builder:set build-dir command", () => {
			expect(DokkuCommands.builderSetBuildDir("my-app", "src")).toBe(
				"dokku builder:set 'my-app' build-dir 'src'"
			);
		});

		it("builderClearBuildDir returns builder:set build-dir without value", () => {
			expect(DokkuCommands.builderClearBuildDir("my-app")).toBe(
				"dokku builder:set 'my-app' build-dir"
			);
		});

		it("builderSetSelected returns builder:set selected command", () => {
			expect(DokkuCommands.builderSetSelected("my-app", "dockerfile")).toBe(
				"dokku builder:set 'my-app' selected 'dockerfile'"
			);
		});

		it("builderClearSelected returns builder:set selected without value", () => {
			expect(DokkuCommands.builderClearSelected("my-app")).toBe(
				"dokku builder:set 'my-app' selected"
			);
		});
	});

	describe("SSL", () => {
		it("letsencryptReport returns letsencrypt:report command", () => {
			expect(DokkuCommands.letsencryptReport("my-app")).toBe("dokku letsencrypt:report my-app");
		});

		it("letsencryptLs returns letsencrypt:ls command", () => {
			expect(DokkuCommands.letsencryptLs()).toBe("dokku letsencrypt:ls");
		});

		it("letsencryptSetEmail returns letsencrypt:set email command", () => {
			expect(DokkuCommands.letsencryptSetEmail("my-app", "admin@example.com")).toBe(
				"dokku letsencrypt:set 'my-app' email 'admin@example.com'"
			);
		});

		it("letsencryptEnable returns letsencrypt:enable command", () => {
			expect(DokkuCommands.letsencryptEnable("my-app")).toBe("dokku letsencrypt:enable my-app");
		});

		it("letsencryptAutoRenew returns letsencrypt:auto-renew command", () => {
			expect(DokkuCommands.letsencryptAutoRenew("my-app")).toBe(
				"dokku letsencrypt:auto-renew my-app"
			);
		});

		it("certsReport returns certs:report command", () => {
			expect(DokkuCommands.certsReport("my-app")).toBe("dokku certs:report my-app");
		});
	});

	describe("network", () => {
		it("networkReport returns network:report command", () => {
			expect(DokkuCommands.networkReport("my-app")).toBe("dokku network:report my-app");
		});

		it("networkSet returns network:set command without value to clear", () => {
			expect(DokkuCommands.networkSet("my-app", "attach-post-create")).toBe(
				"dokku network:set 'my-app' 'attach-post-create'"
			);
		});

		it("networkSet returns network:set command with value", () => {
			expect(DokkuCommands.networkSet("my-app", "initial-network", "my-net")).toBe(
				"dokku network:set 'my-app' 'initial-network' 'my-net'"
			);
		});
	});

	describe("docker options", () => {
		it("dockerOptionsReport returns docker-options:report command", () => {
			expect(DokkuCommands.dockerOptionsReport("my-app")).toBe(
				"dokku docker-options:report my-app"
			);
		});

		it("dockerOptionsAdd returns docker-options:add command", () => {
			expect(DokkuCommands.dockerOptionsAdd("my-app", "deploy", "--cpus=0.5")).toBe(
				"dokku docker-options:add 'my-app' 'deploy' '--cpus=0.5'"
			);
		});

		it("dockerOptionsRemove returns docker-options:remove command", () => {
			expect(DokkuCommands.dockerOptionsRemove("my-app", "deploy", "--cpus=0.5")).toBe(
				"dokku docker-options:remove 'my-app' 'deploy' '--cpus=0.5'"
			);
		});

		it("dockerOptionsClear returns docker-options:clear command", () => {
			expect(DokkuCommands.dockerOptionsClear("my-app", "build")).toBe(
				"dokku docker-options:clear 'my-app' 'build'"
			);
		});
	});

	describe("database", () => {
		it("dbList returns plugin list command", () => {
			expect(DokkuCommands.dbList("postgres")).toBe("dokku postgres:list");
		});

		it("dbLinks returns plugin links command", () => {
			expect(DokkuCommands.dbLinks("postgres", "mydb")).toBe("dokku postgres:links mydb");
		});

		it("dbCreate returns plugin create command", () => {
			expect(DokkuCommands.dbCreate("postgres", "mydb")).toBe("dokku postgres:create mydb");
		});

		it("dbLink returns plugin link command", () => {
			expect(DokkuCommands.dbLink("postgres", "mydb", "my-app")).toBe(
				"dokku postgres:link mydb my-app"
			);
		});

		it("dbUnlink returns plugin unlink command", () => {
			expect(DokkuCommands.dbUnlink("postgres", "mydb", "my-app")).toBe(
				"dokku postgres:unlink mydb my-app"
			);
		});

		it("dbDestroy returns plugin destroy command with --force flag", () => {
			expect(DokkuCommands.dbDestroy("postgres", "mydb")).toBe(
				"dokku postgres:destroy mydb --force"
			);
		});
	});

	describe("logs", () => {
		it("logsFollow returns logs command with tail and follow flags", () => {
			expect(DokkuCommands.logsFollow("my-app", 100)).toBe("dokku logs 'my-app' -t -n 100");
		});
	});
});

describe("parseDokkuVersion", () => {
	it("parses version from 'dokku version X.Y.Z' format", () => {
		expect(parseDokkuVersion("dokku version 0.34.5")).toBe("0.34.5");
	});

	it("parses version from plain semver string", () => {
		expect(parseDokkuVersion("0.34.5")).toBe("0.34.5");
	});

	it("returns null for empty string", () => {
		expect(parseDokkuVersion("")).toBeNull();
	});

	it("returns null when no version number is found", () => {
		expect(parseDokkuVersion("not a version")).toBeNull();
	});

	it("parses version from output with extra whitespace", () => {
		expect(parseDokkuVersion("  dokku version 0.30.0  ")).toBe("0.30.0");
	});
});

describe("getDokkuVersion", () => {
	const mockExecuteCommand = executeCommand as ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns parsed version on success", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku version",
			exitCode: 0,
			stdout: "dokku version 0.34.5",
			stderr: "",
		});

		const version = await getDokkuVersion();

		expect(version).toBe("0.34.5");
		expect(mockExecuteCommand).toHaveBeenCalledWith("dokku version");
	});

	it("returns null when command fails", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku version",
			exitCode: 1,
			stdout: "",
			stderr: "dokku: command not found",
		});

		const version = await getDokkuVersion();

		expect(version).toBeNull();
	});

	it("returns null when stdout is empty", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku version",
			exitCode: 0,
			stdout: "",
			stderr: "",
		});

		const version = await getDokkuVersion();

		expect(version).toBeNull();
	});

	it("returns null when stdout contains no version number", async () => {
		mockExecuteCommand.mockResolvedValue({
			command: "dokku version",
			exitCode: 0,
			stdout: "dokku: not installed",
			stderr: "",
		});

		const version = await getDokkuVersion();

		expect(version).toBeNull();
	});
});
