import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { useToast } from "../components/ToastProvider";
import {
	CommandResultSchema,
	type CommandResult,
	DatabaseSchema,
	type Database,
	AppSchema,
	type App,
} from "../lib/schemas.js";

const SUPPORTED_PLUGINS = ["postgres", "redis", "mysql", "mariadb", "mongo"];
const POPULAR_PLUGIN_REPOS = [
	{ label: "Postgres", repository: "dokku/dokku-postgres", name: "dokku-postgres" },
	{ label: "Redis", repository: "dokku/dokku-redis", name: "dokku-redis" },
	{ label: "MySQL", repository: "dokku/dokku-mysql", name: "dokku-mysql" },
	{ label: "MariaDB", repository: "dokku/dokku-mariadb", name: "dokku-mariadb" },
	{ label: "Mongo", repository: "dokku/dokku-mongo", name: "dokku-mongo" },
];

export function Databases() {
	const { addToast } = useToast();
	const [databases, setDatabases] = useState<Database[]>([]);
	const [apps, setApps] = useState<App[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Create database form state
	const [newDbPlugin, setNewDbPlugin] = useState("");
	const [newDbName, setNewDbName] = useState("");
	const [pluginRepo, setPluginRepo] = useState("");
	const [pluginName, setPluginName] = useState("");

	// Link database state
	const [linkDbName, setLinkDbName] = useState("");
	const [linkAppName, setLinkAppName] = useState("");

	// Unlink database state
	const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
	const [pendingUnlinkDb, setPendingUnlinkDb] = useState("");
	const [pendingUnlinkApp, setPendingUnlinkApp] = useState("");

	// Destroy database state
	const [showDestroyDialog, setShowDestroyDialog] = useState(false);
	const [pendingDestroyDb, setPendingDestroyDb] = useState("");
	const [confirmDestroyName, setConfirmDestroyName] = useState("");

	// Connection info visibility
	const [visibleConnections, setVisibleConnections] = useState<Set<string>>(new Set());

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const [databasesData, appsData] = await Promise.all([
				apiFetch("/databases", z.array(DatabaseSchema)),
				apiFetch("/apps", z.array(AppSchema)),
			]);
			setDatabases(Array.isArray(databasesData) ? databasesData : []);
			setApps(Array.isArray(appsData) ? appsData : []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load data");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateDatabase = async () => {
		if (!newDbPlugin || !newDbName) return;

		try {
			const result = await apiFetch("/databases", CommandResultSchema, {
				method: "POST",
				body: JSON.stringify({ plugin: newDbPlugin, name: newDbName }),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Database created", result);
			setNewDbPlugin("");
			setNewDbName("");
			fetchData();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku ${newDbPlugin}:create ${newDbName}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to create database",
			};
			addToast("error", "Failed to create database", errorResult);
		}
	};

	const handleInstallPlugin = async () => {
		if (!pluginRepo.trim()) return;

		try {
			const body: { repository: string; name?: string } = { repository: pluginRepo.trim() };
			if (pluginName.trim()) body.name = pluginName.trim();

			const result = await apiFetch("/plugins/install", CommandResultSchema, {
				method: "POST",
				body: JSON.stringify(body),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Plugin installation", result);

			if (result.exitCode === 0) {
				setPluginRepo("");
				setPluginName("");
				fetchData();
			}
		} catch (err) {
			const command = pluginName.trim()
				? `dokku plugin:install ${pluginRepo.trim()} ${pluginName.trim()}`
				: `dokku plugin:install ${pluginRepo.trim()}`;
			const errorResult: CommandResult = {
				command,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to install plugin",
			};
			addToast("error", "Failed to install plugin", errorResult);
		}
	};

	const handleLinkDatabase = async () => {
		if (!linkDbName || !linkAppName) return;

		try {
			const result = await apiFetch(`/databases/${linkDbName}/link`, CommandResultSchema, {
				method: "POST",
				body: JSON.stringify({ plugin: getDbPlugin(linkDbName), app: linkAppName }),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Database linked", result);
			setLinkDbName("");
			setLinkAppName("");
			fetchData();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku ${getDbPlugin(linkDbName)}:link ${linkDbName} ${linkAppName}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to link database",
			};
			addToast("error", "Failed to link database", errorResult);
		}
	};

	const handleUnlinkDatabase = (dbName: string, appName: string) => {
		setPendingUnlinkDb(dbName);
		setPendingUnlinkApp(appName);
		setShowUnlinkDialog(true);
	};

	const confirmUnlinkDatabase = async () => {
		if (!pendingUnlinkDb || !pendingUnlinkApp) return;

		try {
			const result = await apiFetch(`/databases/${pendingUnlinkDb}/unlink`, CommandResultSchema, {
				method: "POST",
				body: JSON.stringify({ plugin: getDbPlugin(pendingUnlinkDb), app: pendingUnlinkApp }),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Database unlinked", result);
			setShowUnlinkDialog(false);
			setPendingUnlinkDb("");
			setPendingUnlinkApp("");
			fetchData();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku ${getDbPlugin(pendingUnlinkDb)}:unlink ${pendingUnlinkDb} ${pendingUnlinkApp}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to unlink database",
			};
			addToast("error", "Failed to unlink database", errorResult);
			setShowUnlinkDialog(false);
			setPendingUnlinkDb("");
			setPendingUnlinkApp("");
		}
	};

	const handleDestroyDatabase = (dbName: string) => {
		setPendingDestroyDb(dbName);
		setConfirmDestroyName("");
		setShowDestroyDialog(true);
	};

	const confirmDestroyDatabase = async () => {
		if (!pendingDestroyDb || confirmDestroyName !== pendingDestroyDb) return;

		try {
			const result = await apiFetch(`/databases/${pendingDestroyDb}`, CommandResultSchema, {
				method: "DELETE",
				body: JSON.stringify({
					plugin: getDbPlugin(pendingDestroyDb),
					confirmName: confirmDestroyName,
				}),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Database destroyed", result);
			setShowDestroyDialog(false);
			setPendingDestroyDb("");
			setConfirmDestroyName("");
			fetchData();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku ${getDbPlugin(pendingDestroyDb)}:destroy ${pendingDestroyDb} --force`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to destroy database",
			};
			addToast("error", "Failed to destroy database", errorResult);
			setShowDestroyDialog(false);
			setPendingDestroyDb("");
			setConfirmDestroyName("");
		}
	};

	const toggleConnectionVisibility = (dbName: string) => {
		setVisibleConnections((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(dbName)) {
				newSet.delete(dbName);
			} else {
				newSet.add(dbName);
			}
			return newSet;
		});
	};

	const getDbPlugin = (dbName: string): string => {
		const db = databases.find((d) => d.name === dbName);
		return db?.plugin || "";
	};

	const getDatabasesByPlugin = () => {
		const grouped: Record<string, Database[]> = {};
		for (const db of databases) {
			if (!grouped[db.plugin]) {
				grouped[db.plugin] = [];
			}
			grouped[db.plugin].push(db);
		}
		return grouped;
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

	const groupedDatabases = getDatabasesByPlugin();

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Databases</h1>

			{/* Install Plugin Form */}
			<div className="bg-white rounded-lg shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4">Install Dokku Plugin</h2>
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
						Install Plugin
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

			{/* Create Database Form */}
			<div className="bg-white rounded-lg shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4">Create New Database</h2>
				<div className="flex flex-col sm:flex-row gap-2">
					<select
						value={newDbPlugin}
						onChange={(e) => setNewDbPlugin(e.target.value)}
						className="border rounded px-3 py-2"
					>
						<option value="">Select plugin</option>
						{SUPPORTED_PLUGINS.map((plugin) => (
							<option key={plugin} value={plugin}>
								{plugin}
							</option>
						))}
					</select>
					<input
						type="text"
						placeholder="Database name"
						value={newDbName}
						onChange={(e) => setNewDbName(e.target.value)}
						className="flex-1 border rounded px-3 py-2"
					/>
					<button
						onClick={handleCreateDatabase}
						disabled={!newDbPlugin || !newDbName}
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
					>
						Create
					</button>
				</div>
			</div>

			{/* Databases by Plugin */}
			{Object.keys(groupedDatabases).length === 0 ? (
				<div className="bg-white rounded-lg shadow p-6">
					<p className="text-gray-500">No databases found</p>
				</div>
			) : (
				Object.entries(groupedDatabases).map(([plugin, dbs]) => (
					<div key={plugin} className="bg-white rounded-lg shadow p-6 mb-6">
						<h2 className="text-lg font-semibold mb-4 capitalize">{plugin} Databases</h2>
						{dbs.map((db) => (
							<div key={db.name} className="border rounded p-4 mb-4">
								<div className="space-y-2">
									<div>
										<strong className="text-gray-700">Name:</strong>{" "}
										<code className="bg-gray-100 px-2 py-1 rounded text-sm">{db.name}</code>
									</div>
									<div>
										<strong className="text-gray-700">Plugin:</strong> {db.plugin}
									</div>
									<div>
										<strong className="text-gray-700">Linked Apps:</strong>
										{db.linkedApps.length > 0 ? (
											<ul className="list-disc list-inside ml-4 mt-1">
												{db.linkedApps.map((app) => (
													<li key={app} className="flex items-center justify-between py-1">
														<span>{app}</span>
														<button
															onClick={() => handleUnlinkDatabase(db.name, app)}
															className="ml-4 text-red-600 hover:text-red-800 text-sm"
															title="Unlink"
														>
															Unlink
														</button>
													</li>
												))}
											</ul>
										) : (
											<span className="text-gray-400">No linked apps</span>
										)}
									</div>
									<div>
										<strong className="text-gray-700">Connection Info:</strong>
										<button
											onClick={() => toggleConnectionVisibility(db.name)}
											className="font-mono text-sm cursor-pointer hover:text-blue-600 ml-2"
										>
											{visibleConnections.has(db.name) ? db.connectionInfo : "••••••••••••"}
										</button>
									</div>

									{/* Link App Form */}
									{apps.length > 0 && (
										<div className="mt-4 pt-4 border-t">
											<div className="flex flex-col sm:flex-row gap-2">
												<span className="text-sm font-medium text-gray-700 self-center">
													Link App:
												</span>
												<select
													value={linkDbName === db.name ? linkAppName : ""}
													onChange={(e) => {
														setLinkDbName(db.name);
														setLinkAppName(e.target.value);
													}}
													className="flex-1 border rounded px-3 py-2 text-sm"
												>
													<option value="">Select app</option>
													{apps
														.filter((app) => !db.linkedApps.includes(app.name))
														.map((app) => (
															<option key={app.name} value={app.name}>
																{app.name}
															</option>
														))}
												</select>
												<button
													onClick={handleLinkDatabase}
													disabled={linkAppName === "" || linkDbName !== db.name}
													className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
												>
													Link
												</button>
											</div>
										</div>
									)}

									{/* Destroy Database Button */}
									<div className="mt-4 pt-4 border-t">
										<button
											onClick={() => handleDestroyDatabase(db.name)}
											className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
										>
											Destroy Database
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				))
			)}

			{/* Unlink Confirmation Dialog */}
			{showUnlinkDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4">Confirm Unlink</h2>
						<p className="mb-6">
							Are you sure you want to unlink <strong>{pendingUnlinkApp}</strong> from{" "}
							<strong>{pendingUnlinkDb}</strong>?
						</p>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => {
									setShowUnlinkDialog(false);
									setPendingUnlinkDb("");
									setPendingUnlinkApp("");
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmUnlinkDatabase}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
							>
								Unlink
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Destroy Confirmation Dialog */}
			{showDestroyDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4">Confirm Destroy</h2>
						<p className="mb-2">
							This action cannot be undone. Are you sure you want to destroy database{" "}
							<strong>{pendingDestroyDb}</strong>?
						</p>
						<p className="mb-4 text-sm text-gray-600">Type the database name to confirm:</p>
						<input
							type="text"
							value={confirmDestroyName}
							onChange={(e) => setConfirmDestroyName(e.target.value)}
							placeholder={pendingDestroyDb}
							className="w-full border rounded px-3 py-2 mb-4"
						/>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => {
									setShowDestroyDialog(false);
									setPendingDestroyDb("");
									setConfirmDestroyName("");
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmDestroyDatabase}
								disabled={confirmDestroyName !== pendingDestroyDb}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								Destroy
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
