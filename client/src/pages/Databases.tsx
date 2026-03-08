import { useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStreamingAction } from "../hooks/use-streaming-action.js";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "@/contexts/auth-context.js";
import { queryKeys } from "../lib/query-keys.js";
import { AppSchema, type Database, DatabaseSchema } from "../lib/schemas.js";

const SUPPORTED_PLUGINS = ["postgres", "redis", "mysql", "mariadb", "mongo"];

const PLUGIN_INSTALL_COMMANDS = [
	{
		label: "Postgres",
		command: "sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git",
	},
	{ label: "Redis", command: "sudo dokku plugin:install https://github.com/dokku/dokku-redis.git" },
	{ label: "MySQL", command: "sudo dokku plugin:install https://github.com/dokku/dokku-mysql.git" },
	{
		label: "MariaDB",
		command: "sudo dokku plugin:install https://github.com/dokku/dokku-mariadb.git",
	},
	{ label: "Mongo", command: "sudo dokku plugin:install https://github.com/dokku/dokku-mongo.git" },
] as const;

export function Databases() {
	const { canModify } = useAuth();
	const { execute: streamAction } = useStreamingAction();
	const queryClient = useQueryClient();

	const {
		data: databases = [],
		isLoading: databasesLoading,
		error: databasesError,
	} = useQuery({
		queryKey: queryKeys.databases,
		queryFn: () => apiFetch("/databases", z.array(DatabaseSchema)),
	});

	const {
		data: apps = [],
		isLoading: appsLoading,
		error: appsError,
	} = useQuery({
		queryKey: queryKeys.apps.all,
		queryFn: () => apiFetch("/apps", z.array(AppSchema)),
	});

	const isLoading = databasesLoading || appsLoading;
	const error = databasesError || appsError;

	// Create database form state
	const [newDbPlugin, setNewDbPlugin] = useState("");
	const [newDbName, setNewDbName] = useState("");

	// Link database state
	const [linkDbName, setLinkDbName] = useState("");
	const [linkAppName, setLinkAppName] = useState("");

	// Unlink database state
	const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
	const [pendingUnlinkDb, setPendingUnlinkDb] = useState("");
	const [pendingUnlinkApp, setPendingUnlinkApp] = useState("");
	const [unlinkSubmitting, setUnlinkSubmitting] = useState(false);

	// Destroy database state
	const [showDestroyDialog, setShowDestroyDialog] = useState(false);
	const [pendingDestroyDb, setPendingDestroyDb] = useState("");
	const [confirmDestroyName, setConfirmDestroyName] = useState("");
	const [destroySubmitting, setDestroySubmitting] = useState(false);
	const [createDbSubmitting, setCreateDbSubmitting] = useState(false);
	const [linkSubmitting, setLinkSubmitting] = useState(false);

	// Connection info visibility
	const [visibleConnections, setVisibleConnections] = useState<Set<string>>(new Set());

	const handleCreateDatabase = async () => {
		if (!newDbPlugin || !newDbName || createDbSubmitting) return;

		setCreateDbSubmitting(true);
		await streamAction("/databases", `create ${newDbPlugin} ${newDbName}`, {
			body: JSON.stringify({ plugin: newDbPlugin, name: newDbName }),
			onSuccess: () => {
				setNewDbPlugin("");
				setNewDbName("");
				void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
				void queryClient.refetchQueries({ queryKey: queryKeys.databases });
			},
			onError: () => {
				void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
				void queryClient.refetchQueries({ queryKey: queryKeys.databases });
			},
		});
		setCreateDbSubmitting(false);
	};

	const handleLinkDatabase = async () => {
		if (!linkDbName || !linkAppName || linkSubmitting) return;

		setLinkSubmitting(true);
		await streamAction(`/databases/${encodeURIComponent(linkDbName)}/link`, "link database", {
			body: JSON.stringify({ plugin: getDbPlugin(linkDbName), app: linkAppName }),
			onSuccess: () => {
				setLinkDbName("");
				setLinkAppName("");
				void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
				void queryClient.refetchQueries({ queryKey: queryKeys.databases });
			},
			onError: () => {
				void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
				void queryClient.refetchQueries({ queryKey: queryKeys.databases });
			},
		});
		setLinkSubmitting(false);
	};

	const handleUnlinkDatabase = (dbName: string, appName: string) => {
		setPendingUnlinkDb(dbName);
		setPendingUnlinkApp(appName);
		setShowUnlinkDialog(true);
	};

	const confirmUnlinkDatabase = async () => {
		if (!pendingUnlinkDb || !pendingUnlinkApp || unlinkSubmitting) return;

		const closeUnlinkDialog = () => {
			setShowUnlinkDialog(false);
			setPendingUnlinkDb("");
			setPendingUnlinkApp("");
		};

		setUnlinkSubmitting(true);
		await streamAction(
			`/databases/${encodeURIComponent(pendingUnlinkDb)}/unlink`,
			"unlink database",
			{
				body: JSON.stringify({ plugin: getDbPlugin(pendingUnlinkDb), app: pendingUnlinkApp }),
				onSuccess: () => {
					closeUnlinkDialog();
					void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
					void queryClient.refetchQueries({ queryKey: queryKeys.databases });
				},
				onError: () => {
					closeUnlinkDialog();
					void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
					void queryClient.refetchQueries({ queryKey: queryKeys.databases });
				},
			}
		);
		setUnlinkSubmitting(false);
	};

	const handleDestroyDatabase = (dbName: string) => {
		setPendingDestroyDb(dbName);
		setConfirmDestroyName("");
		setShowDestroyDialog(true);
	};

	const confirmDestroyDatabase = async () => {
		if (!pendingDestroyDb || confirmDestroyName !== pendingDestroyDb || destroySubmitting) return;

		const closeDestroyDialog = () => {
			setShowDestroyDialog(false);
			setPendingDestroyDb("");
			setConfirmDestroyName("");
		};

		setDestroySubmitting(true);
		await streamAction(`/databases/${encodeURIComponent(pendingDestroyDb)}`, "destroy database", {
			method: "DELETE",
			body: JSON.stringify({
				plugin: getDbPlugin(pendingDestroyDb),
				confirmName: confirmDestroyName,
			}),
			onSuccess: () => {
				closeDestroyDialog();
				void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
				void queryClient.refetchQueries({ queryKey: queryKeys.databases });
			},
			onError: () => {
				closeDestroyDialog();
				void queryClient.invalidateQueries({ queryKey: queryKeys.databases });
				void queryClient.refetchQueries({ queryKey: queryKeys.databases });
			},
		});
		setDestroySubmitting(false);
	};

	const toggleConnectionVisibility = (dbName: string) => {
		setVisibleConnections((prev) => {
			const next = new Set(prev);
			next.has(dbName) ? next.delete(dbName) : next.add(dbName);
			return next;
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

	if (isLoading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
				{error instanceof Error ? error.message : "Failed to load data"}
			</div>
		);
	}

	const groupedDatabases = getDatabasesByPlugin();

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Databases</h1>

			{/* Install Plugin Guide */}
			{databases.length === 0 && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
					<h2 className="text-lg font-semibold mb-2">Install a Database Plugin</h2>
					<p className="text-sm text-gray-700 mb-3">
						Run one of these commands on your Dokku server to install a database plugin:
					</p>
					<div className="space-y-2">
						{PLUGIN_INSTALL_COMMANDS.map((plugin) => (
							<div key={plugin.label} className="flex items-center gap-2">
								<span className="text-sm font-medium w-20">{plugin.label}:</span>
								<code className="flex-1 bg-white border rounded px-3 py-1.5 text-sm font-mono select-all">
									{plugin.command}
								</code>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Create Database Form */}
			{canModify && (
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
							disabled={!newDbPlugin || !newDbName || createDbSubmitting}
							className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							Create
						</button>
					</div>
					{newDbPlugin && (
						<p className="mt-2 text-xs text-gray-500">
							Ensure the plugin is installed on your Dokku server first via SSH:{" "}
							<code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono select-all">
								{PLUGIN_INSTALL_COMMANDS.find((p) => p.label.toLowerCase() === newDbPlugin)
									?.command ?? `sudo dokku plugin:install <plugin-url>`}
							</code>
						</p>
					)}
				</div>
			)}

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
														{canModify && (
															<button
																onClick={() => handleUnlinkDatabase(db.name, app)}
																className="ml-4 text-red-600 hover:text-red-800 text-sm"
																title="Unlink"
															>
																Unlink
															</button>
														)}
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
									{canModify && apps.length > 0 && (
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
													disabled={linkAppName === "" || linkDbName !== db.name || linkSubmitting}
													className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
												>
													Link
												</button>
											</div>
										</div>
									)}

									{/* Destroy Database Button */}
									{canModify && (
										<div className="mt-4 pt-4 border-t">
											<button
												onClick={() => handleDestroyDatabase(db.name)}
												className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
											>
												Destroy Database
											</button>
										</div>
									)}
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
									if (unlinkSubmitting) return;
									setShowUnlinkDialog(false);
									setPendingUnlinkDb("");
									setPendingUnlinkApp("");
								}}
								disabled={unlinkSubmitting}
								className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={confirmUnlinkDatabase}
								disabled={unlinkSubmitting}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{unlinkSubmitting ? "Unlinking..." : "Unlink"}
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
									if (destroySubmitting) return;
									setShowDestroyDialog(false);
									setPendingDestroyDb("");
									setConfirmDestroyName("");
								}}
								disabled={destroySubmitting}
								className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={confirmDestroyDatabase}
								disabled={confirmDestroyName !== pendingDestroyDb || destroySubmitting}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{destroySubmitting ? "Destroying..." : "Destroy"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
