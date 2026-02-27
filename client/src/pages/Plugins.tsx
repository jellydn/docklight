import { useEffect, useState } from "react";
import { useToast } from "../components/ToastProvider";
import type { CommandResult } from "../components/types";
import { apiFetch } from "../lib/api";

interface PluginInfo {
	name: string;
	enabled: boolean;
	version?: string;
}

const POPULAR_PLUGIN_REPOS = [
	{ label: "Postgres", repository: "dokku/dokku-postgres", name: "dokku-postgres" },
	{ label: "Redis", repository: "dokku/dokku-redis", name: "dokku-redis" },
	{ label: "MySQL", repository: "dokku/dokku-mysql", name: "dokku-mysql" },
	{ label: "MariaDB", repository: "dokku/dokku-mariadb", name: "dokku-mariadb" },
	{ label: "Mongo", repository: "dokku/dokku-mongo", name: "dokku-mongo" },
];

export function Plugins() {
	const { addToast } = useToast();
	const [plugins, setPlugins] = useState<PluginInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [pluginRepo, setPluginRepo] = useState("");
	const [pluginName, setPluginName] = useState("");

	const fetchPlugins = async () => {
		setLoading(true);
		setError(null);
		try {
			const pluginData = await apiFetch<PluginInfo[]>("/plugins");
			setPlugins(Array.isArray(pluginData) ? pluginData : []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load plugins");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPlugins();
	}, []);

	const handleInstallPlugin = async () => {
		if (!pluginRepo.trim()) return;

		try {
			const body: { repository: string; name?: string } = { repository: pluginRepo.trim() };
			if (pluginName.trim()) body.name = pluginName.trim();

			const result = await apiFetch<CommandResult>("/plugins/install", {
				method: "POST",
				body: JSON.stringify(body),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Plugin installation", result);

			if (result.exitCode === 0) {
				setPluginRepo("");
				setPluginName("");
				fetchPlugins();
			}
		} catch (err) {
			const command = pluginName.trim()
				? `dokku plugin:install ${pluginRepo.trim()} ${pluginName.trim()}`
				: `dokku plugin:install ${pluginRepo.trim()}`;
			addToast("error", "Failed to install plugin", {
				command,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to install plugin",
			});
		}
	};

	const runPluginAction = async (pluginNameValue: string, action: "enable" | "disable" | "uninstall") => {
		const commandMap = {
			enable: `dokku plugin:enable ${pluginNameValue}`,
			disable: `dokku plugin:disable ${pluginNameValue}`,
			uninstall: `dokku plugin:uninstall ${pluginNameValue}`,
		};

		try {
			const result = await apiFetch<CommandResult>(
				action === "uninstall" ? `/plugins/${pluginNameValue}` : `/plugins/${pluginNameValue}/${action}`,
				{ method: action === "uninstall" ? "DELETE" : "POST" }
			);
			addToast(
				result.exitCode === 0 ? "success" : "error",
				`Plugin ${action}${action === "disable" ? "d" : "ed"}`,
				result
			);
			if (result.exitCode === 0) {
				fetchPlugins();
			}
		} catch (err) {
			addToast("error", `Failed to ${action} plugin`, {
				command: commandMap[action],
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : `Failed to ${action} plugin`,
			});
		}
	};

	const handleUninstall = async (pluginNameValue: string) => {
		const confirmed = window.confirm(`Uninstall plugin "${pluginNameValue}"?`);
		if (!confirmed) return;
		await runPluginAction(pluginNameValue, "uninstall");
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Plugins</h1>

			<div className="bg-white rounded-lg shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4">Install Plugin</h2>
				<div className="grid gap-2 md:grid-cols-3">
					<input
						type="text"
						placeholder="Repository URL or owner/repo"
						value={pluginRepo}
						onChange={(e) => setPluginRepo(e.target.value)}
						className="border rounded px-3 py-2"
					/>
					<input
						type="text"
						placeholder="Plugin name (optional)"
						value={pluginName}
						onChange={(e) => setPluginName(e.target.value)}
						className="border rounded px-3 py-2"
					/>
					<button
						onClick={handleInstallPlugin}
						disabled={!pluginRepo.trim()}
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
					>
						Install
					</button>
				</div>
				<div className="flex flex-wrap gap-2 mt-3">
					{POPULAR_PLUGIN_REPOS.map((plugin) => (
						<button
							key={plugin.name}
							onClick={() => {
								setPluginRepo(plugin.repository);
								setPluginName(plugin.name);
							}}
							className="text-sm border rounded px-2 py-1 hover:bg-gray-50"
						>
							{plugin.label}
						</button>
					))}
				</div>
			</div>

			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold mb-4">Installed Plugins</h2>
				{plugins.length === 0 ? (
					<p className="text-gray-500">No plugins found</p>
				) : (
					<div className="space-y-3">
						{plugins.map((plugin) => (
							<div
								key={plugin.name}
								className="border rounded p-4 flex items-center justify-between gap-4"
							>
								<div>
									<div className="font-medium">{plugin.name}</div>
									<div className="text-sm text-gray-600">
										Status: {plugin.enabled ? "Enabled" : "Disabled"}
										{plugin.version ? ` • v${plugin.version}` : ""}
									</div>
								</div>
								<div className="flex gap-2">
									{plugin.enabled ? (
										<button
											onClick={() => runPluginAction(plugin.name, "disable")}
											className="border border-amber-500 text-amber-700 px-3 py-1 rounded hover:bg-amber-50"
										>
											Disable
										</button>
									) : (
										<button
											onClick={() => runPluginAction(plugin.name, "enable")}
											className="border border-green-500 text-green-700 px-3 py-1 rounded hover:bg-green-50"
										>
											Enable
										</button>
									)}
									<button
										onClick={() => handleUninstall(plugin.name)}
										className="border border-red-500 text-red-700 px-3 py-1 rounded hover:bg-red-50"
									>
										Uninstall
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
