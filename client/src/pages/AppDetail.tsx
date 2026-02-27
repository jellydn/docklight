import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import type { CommandResult } from "../components/types";
import { apiFetch } from "../lib/api";
import { logger } from "../lib/logger";

interface AppDetail {
	name: string;
	status: "running" | "stopped";
	gitRemote: string;
	domains: string[];
	processes: Record<string, number>;
}

interface SSLStatus {
	active: boolean;
	expiryDate?: string;
	certProvider?: string;
}

type TabType = "overview" | "config" | "domains" | "logs" | "ssl";

interface ConfigVars {
	[key: string]: string;
}

interface ScaleChange {
	processType: string;
	count: number;
}

export function AppDetail() {
	const { name } = useParams<{ name: string }>();
	const { addToast } = useToast();
	const [app, setApp] = useState<AppDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showActionDialog, setShowActionDialog] = useState(false);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [showScaleDialog, setShowScaleDialog] = useState(false);
	const [pendingScaleChanges, setPendingScaleChanges] = useState<ScaleChange[]>([]);
	const [scaleChanges, setScaleChanges] = useState<Record<string, number>>({});
	const [activeTab, setActiveTab] = useState<TabType>("overview");

	// Config vars state
	const [configVars, setConfigVars] = useState<ConfigVars>({});
	const [configLoading, setConfigLoading] = useState(false);
	const [configError, setConfigError] = useState<string | null>(null);
	const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
	const [newConfigKey, setNewConfigKey] = useState("");
	const [newConfigValue, setNewConfigValue] = useState("");
	const [showRemoveDialog, setShowRemoveDialog] = useState(false);
	const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null);

	// Domains state
	const [domains, setDomains] = useState<string[]>([]);
	const [domainsLoading, setDomainsLoading] = useState(false);
	const [domainsError, setDomainsError] = useState<string | null>(null);
	const [newDomain, setNewDomain] = useState("");
	const [showDomainRemoveDialog, setShowDomainRemoveDialog] = useState(false);
	const [pendingRemoveDomain, setPendingRemoveDomain] = useState<string | null>(null);

	// SSL state
	const [sslStatus, setSslStatus] = useState<SSLStatus | null>(null);
	const [sslLoading, setSslLoading] = useState(false);
	const [sslError, setSslError] = useState<string | null>(null);

	// Log viewer state
	const [logs, setLogs] = useState<string[]>([]);
	const [connectionStatus, setConnectionStatus] = useState<
		"connected" | "disconnected" | "reconnecting"
	>("disconnected");
	const [autoScroll, setAutoScroll] = useState(true);
	const [lineCount, setLineCount] = useState(100);
	const wsRef = useRef<WebSocket | null>(null);
	const logsEndRef = useRef<HTMLPreElement>(null);

	useEffect(() => {
		if (name) {
			fetchAppDetail();
		}
	}, [name, fetchAppDetail]);

	useEffect(() => {
		if (activeTab === "logs" && name) {
			connectWebSocket();
		}

		return () => {
			disconnectWebSocket();
		};
	}, [activeTab, name, disconnectWebSocket, connectWebSocket]);

	useEffect(() => {
		if (activeTab === "config" && name) {
			fetchConfigVars();
		}
	}, [activeTab, name, fetchConfigVars]);

	useEffect(() => {
		if (activeTab === "domains" && name) {
			fetchDomains();
		}
	}, [activeTab, name, fetchDomains]);

	useEffect(() => {
		if (activeTab === "ssl" && name) {
			fetchSSLStatus();
		}
	}, [activeTab, name, fetchSSLStatus]);

	useEffect(() => {
		if (autoScroll && logsEndRef.current) {
			logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
		}
	}, [autoScroll]);

	const connectWebSocket = () => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/api/apps/${name}/logs/stream`;

		try {
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onopen = () => {
				setConnectionStatus("connected");
				setLogs([]);
				ws.send(JSON.stringify({ lines: lineCount }));
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.line) {
						setLogs((prev) => {
							const next = [...prev, data.line];
							return next.length > 10000 ? next.slice(-10000) : next;
						});
					}
					if (data.error && !data.line) {
						setConnectionStatus("disconnected");
					}
				} catch (err) {
					logger.error({ err }, "Error parsing WebSocket message");
				}
			};

			ws.onclose = () => {
				setConnectionStatus("disconnected");
			};

			ws.onerror = () => {
				setConnectionStatus("disconnected");
			};
		} catch (err) {
			logger.error({ err }, "Failed to connect to WebSocket");
			setConnectionStatus("disconnected");
		}
	};

	const disconnectWebSocket = () => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
	};

	const fetchAppDetail = async () => {
		try {
			const appData = await apiFetch<AppDetail>(`/apps/${name}`);
			setApp(appData);
			setLoading(false);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load app details");
			setLoading(false);
		}
	};

	const handleAction = async (action: "restart" | "rebuild") => {
		setPendingAction(action);
		setShowActionDialog(true);
	};

	const confirmAction = async () => {
		if (!pendingAction || !name) return;

		try {
			const result = await apiFetch<CommandResult>(`/apps/${name}/${pendingAction}`, {
				method: "POST",
			});
			addToast(result.exitCode === 0 ? "success" : "error", `${pendingAction} completed`, result);
			setShowActionDialog(false);
			setPendingAction(null);
			fetchAppDetail();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku ps:${pendingAction} ${name}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Action failed",
			};
			addToast("error", `${pendingAction} failed`, errorResult);
			setShowActionDialog(false);
			setPendingAction(null);
		}
	};

	const handleScaleChange = (processType: string, count: number, currentCount: number) => {
		if (!Number.isInteger(count) || count < 0) {
			return;
		}

		setScaleChanges((prev) => {
			if (count === currentCount) {
				const next = { ...prev };
				delete next[processType];
				return next;
			}

			return {
				...prev,
				[processType]: count,
			};
		});
	};

	const handleApplyScale = async () => {
		if (!name) return;

		const entries = Object.entries(scaleChanges);
		if (entries.length === 0) return;

		setPendingScaleChanges(entries.map(([processType, count]) => ({ processType, count })));
		setShowScaleDialog(true);
	};

	const confirmScale = async () => {
		if (!name || pendingScaleChanges.length === 0) return;

		for (const change of pendingScaleChanges) {
			try {
				const result = await apiFetch<CommandResult>(`/apps/${name}/scale`, {
					method: "POST",
					body: JSON.stringify({
						processType: change.processType,
						count: change.count,
					}),
				});
				addToast(
					result.exitCode === 0 ? "success" : "error",
					`Scale ${change.processType} to ${change.count}`,
					result
				);
			} catch (err) {
				const errorResult: CommandResult = {
					command: `dokku ps:scale ${name} ${change.processType}=${change.count}`,
					exitCode: 1,
					stdout: "",
					stderr: err instanceof Error ? err.message : "Scale failed",
				};
				addToast("error", `Scale ${change.processType} failed`, errorResult);
			}
		}

		setShowScaleDialog(false);
		setPendingScaleChanges([]);
		setScaleChanges({});
		fetchAppDetail();
	};

	const fetchConfigVars = async () => {
		if (!name) return;

		setConfigLoading(true);
		setConfigError(null);
		try {
			const config = await apiFetch<ConfigVars>(`/apps/${name}/config`);
			setConfigVars(config);
		} catch (err) {
			setConfigError(err instanceof Error ? err.message : "Failed to load config vars");
		} finally {
			setConfigLoading(false);
		}
	};

	const handleAddConfigVar = async () => {
		if (!name || !newConfigKey || !newConfigValue) return;

		try {
			const result = await apiFetch<CommandResult>(`/apps/${name}/config`, {
				method: "POST",
				body: JSON.stringify({ key: newConfigKey, value: newConfigValue }),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Config var set", result);
			setNewConfigKey("");
			setNewConfigValue("");
			fetchConfigVars();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku config:set ${name} ${newConfigKey}=***`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to set config var",
			};
			addToast("error", "Failed to set config var", errorResult);
		}
	};

	const handleRemoveConfigVar = (key: string) => {
		setPendingRemoveKey(key);
		setShowRemoveDialog(true);
	};

	const confirmRemoveConfigVar = async () => {
		if (!name || !pendingRemoveKey) return;

		try {
			const result = await apiFetch<CommandResult>(`/apps/${name}/config/${pendingRemoveKey}`, {
				method: "DELETE",
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Config var removed", result);
			setShowRemoveDialog(false);
			setPendingRemoveKey(null);
			fetchConfigVars();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku config:unset ${name} ${pendingRemoveKey}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to unset config var",
			};
			addToast("error", "Failed to unset config var", errorResult);
			setShowRemoveDialog(false);
			setPendingRemoveKey(null);
		}
	};

	const toggleValueVisibility = (key: string) => {
		setVisibleValues((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(key)) {
				newSet.delete(key);
			} else {
				newSet.add(key);
			}
			return newSet;
		});
	};

	const fetchDomains = async () => {
		if (!name) return;

		setDomainsLoading(true);
		setDomainsError(null);
		try {
			const domainsData = await apiFetch<string[]>(`/apps/${name}/domains`);
			setDomains(domainsData);
		} catch (err) {
			setDomainsError(err instanceof Error ? err.message : "Failed to load domains");
		} finally {
			setDomainsLoading(false);
		}
	};

	const handleAddDomain = async () => {
		if (!name || !newDomain) return;

		try {
			const result = await apiFetch<CommandResult>(`/apps/${name}/domains`, {
				method: "POST",
				body: JSON.stringify({ domain: newDomain }),
			});
			addToast(result.exitCode === 0 ? "success" : "error", "Domain added", result);
			setNewDomain("");
			fetchDomains();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku domains:add ${name} ${newDomain}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to add domain",
			};
			addToast("error", "Failed to add domain", errorResult);
		}
	};

	const handleRemoveDomain = (domain: string) => {
		setPendingRemoveDomain(domain);
		setShowDomainRemoveDialog(true);
	};

	const confirmRemoveDomain = async () => {
		if (!name || !pendingRemoveDomain) return;

		try {
			const result = await apiFetch<CommandResult>(
				`/apps/${name}/domains/${encodeURIComponent(pendingRemoveDomain)}`,
				{
					method: "DELETE",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Domain removed", result);
			setShowDomainRemoveDialog(false);
			setPendingRemoveDomain(null);
			fetchDomains();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku domains:remove ${name} ${pendingRemoveDomain}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to remove domain",
			};
			addToast("error", "Failed to remove domain", errorResult);
			setShowDomainRemoveDialog(false);
			setPendingRemoveDomain(null);
		}
	};

	const fetchSSLStatus = async () => {
		if (!name) return;

		setSslLoading(true);
		setSslError(null);
		try {
			const ssl = await apiFetch<SSLStatus>(`/apps/${name}/ssl`);
			setSslStatus(ssl);
		} catch (err) {
			setSslError(err instanceof Error ? err.message : "Failed to load SSL status");
		} finally {
			setSslLoading(false);
		}
	};

	const handleEnableSSL = async () => {
		if (!name) return;

		try {
			const result = await apiFetch<CommandResult>(`/apps/${name}/ssl/enable`, {
				method: "POST",
			});
			addToast(result.exitCode === 0 ? "success" : "error", "SSL enabled", result);
			fetchSSLStatus();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku letsencrypt:enable ${name}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to enable SSL",
			};
			addToast("error", "Failed to enable SSL", errorResult);
		}
	};

	const handleRenewSSL = async () => {
		if (!name) return;

		try {
			const result = await apiFetch<CommandResult>(`/apps/${name}/ssl/renew`, {
				method: "POST",
			});
			addToast(result.exitCode === 0 ? "success" : "error", "SSL renewed", result);
			fetchSSLStatus();
		} catch (err) {
			const errorResult: CommandResult = {
				command: `dokku letsencrypt:auto-renew ${name}`,
				exitCode: 1,
				stdout: "",
				stderr: err instanceof Error ? err.message : "Failed to renew SSL",
			};
			addToast("error", "Failed to renew SSL", errorResult);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error || !app) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
				{error || "App not found"}
			</div>
		);
	}

	const getStatusBadge = () => {
		const color =
			app.status === "running" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
		return (
			<span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>{app.status}</span>
		);
	};

	const getConnectionStatusBadge = () => {
		const colors = {
			connected: "bg-green-100 text-green-800",
			disconnected: "bg-gray-100 text-gray-800",
			reconnecting: "bg-yellow-100 text-yellow-800",
		};
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[connectionStatus]}`}>
				{connectionStatus}
			</span>
		);
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-2xl font-bold">{app.name}</h1>
					<div className="mt-2">{getStatusBadge()}</div>
				</div>
				{activeTab === "overview" && (
					<div className="space-x-2">
						<button
							onClick={() => handleAction("restart")}
							className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
						>
							Restart
						</button>
						<button
							onClick={() => handleAction("rebuild")}
							className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
						>
							Rebuild
						</button>
					</div>
				)}
			</div>

			{showActionDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4">Confirm Action</h2>
						<p className="mb-6">
							Are you sure you want to {pendingAction} <strong>{app.name}</strong>?
						</p>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => {
									setShowActionDialog(false);
									setPendingAction(null);
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmAction}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}

			{showScaleDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4">Confirm Scale</h2>
						<p className="mb-3">
							Apply these scaling changes for <strong>{app.name}</strong>?
						</p>
						<ul className="mb-6 list-disc list-inside">
							{pendingScaleChanges.map((change) => (
								<li key={change.processType}>
									<strong>{change.processType}</strong>: {change.count}
								</li>
							))}
						</ul>
						<div className="flex justify-end space-x-2">
							<button
								type="button"
								onClick={() => {
									setShowScaleDialog(false);
									setPendingScaleChanges([]);
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmScale}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
							>
								Confirm
							</button>
						</div>
					</div>
				</div>
			)}

			{showRemoveDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4">Confirm Remove</h2>
						<p className="mb-6">
							Are you sure you want to remove environment variable{" "}
							<strong>{pendingRemoveKey}</strong>?
						</p>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => {
									setShowRemoveDialog(false);
									setPendingRemoveKey(null);
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmRemoveConfigVar}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
							>
								Remove
							</button>
						</div>
					</div>
				</div>
			)}

			{showDomainRemoveDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4">Confirm Remove</h2>
						<p className="mb-6">
							Are you sure you want to remove domain <strong>{pendingRemoveDomain}</strong>?
						</p>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => {
									setShowDomainRemoveDialog(false);
									setPendingRemoveDomain(null);
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmRemoveDomain}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
							>
								Remove
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="border-b mb-4">
				<nav className="flex space-x-4">
					<button
						onClick={() => setActiveTab("overview")}
						className={`pb-2 px-2 ${activeTab === "overview" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
					>
						Overview
					</button>
					<button
						onClick={() => setActiveTab("config")}
						className={`pb-2 px-2 ${activeTab === "config" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
					>
						Config
					</button>
					<button
						onClick={() => setActiveTab("domains")}
						className={`pb-2 px-2 ${activeTab === "domains" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
					>
						Domains
					</button>
					<button
						onClick={() => setActiveTab("logs")}
						className={`pb-2 px-2 ${activeTab === "logs" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
					>
						Logs
					</button>
					<button
						onClick={() => setActiveTab("ssl")}
						className={`pb-2 px-2 ${activeTab === "ssl" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
					>
						SSL
					</button>
				</nav>
			</div>

			{activeTab === "overview" && (
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">Overview</h2>
					<div className="space-y-4">
						<div>
							<strong className="text-gray-700">Status:</strong> {getStatusBadge()}
						</div>
						<div>
							<strong className="text-gray-700">Git Remote:</strong>{" "}
							<code className="bg-gray-100 px-2 py-1 rounded text-sm">{app.gitRemote || "-"}</code>
						</div>
						<div>
							<strong className="text-gray-700">Domains:</strong>
							{app.domains.length > 0 ? (
								<ul className="list-disc list-inside ml-4">
									{app.domains.map((domain) => (
										<li key={domain}>{domain}</li>
									))}
								</ul>
							) : (
								<span className="text-gray-400">No domains</span>
							)}
						</div>
						<div>
							<strong className="text-gray-700">Processes:</strong>
							{Object.keys(app.processes).length > 0 ? (
								<div className="mt-4">
									<div className="space-y-3">
										{Object.entries(app.processes).map(([type, count]) => (
											<div key={type} className="flex items-center space-x-4">
												<div className="w-32 font-medium">{type}</div>
												<div className="flex items-center space-x-2">
													<span className="text-gray-600">Current:</span>
													<span className="font-mono">{count}</span>
												</div>
												<div className="flex items-center space-x-2">
													<span className="text-gray-600">Scale to:</span>
													<input
														type="number"
														min="0"
														max="100"
														defaultValue={count}
														onChange={(e) =>
															handleScaleChange(type, parseInt(e.target.value, 10), count)
														}
														className="w-20 border rounded px-2 py-1"
													/>
												</div>
											</div>
										))}
									</div>
									{Object.keys(scaleChanges).length > 0 && (
										<div className="mt-4">
											<button
												onClick={handleApplyScale}
												className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
											>
												Apply Scaling
											</button>
										</div>
									)}
								</div>
							) : (
								<span className="text-gray-400">No processes running</span>
							)}
						</div>
					</div>
				</div>
			)}

			{activeTab === "logs" && (
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold">Logs</h2>
						<div className="flex items-center space-x-4">
							{getConnectionStatusBadge()}
							<select
								value={lineCount}
								onChange={(e) => setLineCount(parseInt(e.target.value, 10))}
								className="border rounded px-2 py-1"
							>
								<option value={100}>100 lines</option>
								<option value={500}>500 lines</option>
								<option value={1000}>1000 lines</option>
							</select>
							<button
								onClick={() => setAutoScroll(!autoScroll)}
								className="px-3 py-1 border rounded hover:bg-gray-100"
							>
								{autoScroll ? "Auto-scroll: ON" : "Auto-scroll: OFF"}
							</button>
						</div>
					</div>
					<div className="bg-gray-900 rounded p-4 h-96 overflow-y-auto">
						<pre ref={logsEndRef} className="text-green-400 font-mono text-sm whitespace-pre-wrap">
							{logs.length > 0
								? logs.join("\n")
								: connectionStatus === "connected"
									? "Waiting for logs..."
									: "Not connected"}
						</pre>
					</div>
				</div>
			)}

			{activeTab === "config" && (
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold">Environment Variables</h2>
					</div>

					{configLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						</div>
					) : configError ? (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							{configError}
						</div>
					) : (
						<>
							<div className="mb-6">
								<h3 className="text-sm font-medium text-gray-700 mb-2">Add New Variable</h3>
								<div className="flex space-x-2">
									<input
										type="text"
										placeholder="Key"
										value={newConfigKey}
										onChange={(e) => setNewConfigKey(e.target.value)}
										className="flex-1 border rounded px-3 py-2"
									/>
									<input
										type="text"
										placeholder="Value"
										value={newConfigValue}
										onChange={(e) => setNewConfigValue(e.target.value)}
										className="flex-1 border rounded px-3 py-2"
									/>
									<button
										onClick={handleAddConfigVar}
										disabled={!newConfigKey || !newConfigValue}
										className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
									>
										Set
									</button>
								</div>
							</div>

							{Object.keys(configVars).length > 0 ? (
								<table className="min-w-full divide-y divide-gray-200">
									<thead>
										<tr>
											<th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Key</th>
											<th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
												Value
											</th>
											<th className="px-4 py-2"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{Object.entries(configVars).map(([key, value]) => (
											<tr key={key}>
												<td className="px-4 py-2">
													<code className="bg-gray-100 px-2 py-1 rounded text-sm">{key}</code>
												</td>
												<td className="px-4 py-2">
													<button
														onClick={() => toggleValueVisibility(key)}
														className="font-mono text-sm cursor-pointer hover:text-blue-600"
													>
														{visibleValues.has(key) ? value : "••••••"}
													</button>
												</td>
												<td className="px-4 py-2 text-right">
													<button
														onClick={() => handleRemoveConfigVar(key)}
														className="text-red-600 hover:text-red-800"
														title="Remove"
													>
														🗑️
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className="text-gray-500">No environment variables configured.</p>
							)}
						</>
					)}
				</div>
			)}

			{activeTab === "domains" && (
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold">Domains</h2>
					</div>

					{domainsLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						</div>
					) : domainsError ? (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							{domainsError}
						</div>
					) : (
						<>
							<div className="mb-6">
								<h3 className="text-sm font-medium text-gray-700 mb-2">Add New Domain</h3>
								<div className="flex space-x-2">
									<input
										type="text"
										placeholder="example.com"
										value={newDomain}
										onChange={(e) => setNewDomain(e.target.value)}
										className="flex-1 border rounded px-3 py-2"
									/>
									<button
										onClick={handleAddDomain}
										disabled={!newDomain}
										className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
									>
										Add
									</button>
								</div>
							</div>

							{domains.length > 0 ? (
								<table className="min-w-full divide-y divide-gray-200">
									<thead>
										<tr>
											<th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
												Domain
											</th>
											<th className="px-4 py-2"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{domains.map((domain) => (
											<tr key={domain}>
												<td className="px-4 py-2">
													<code className="bg-gray-100 px-2 py-1 rounded text-sm">{domain}</code>
												</td>
												<td className="px-4 py-2 text-right">
													<button
														onClick={() => handleRemoveDomain(domain)}
														className="text-red-600 hover:text-red-800"
														title="Remove"
													>
														🗑️
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<p className="text-gray-500">No domains configured.</p>
							)}
						</>
					)}
				</div>
			)}

			{activeTab === "ssl" && (
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-lg font-semibold">SSL Certificate</h2>
					</div>

					{sslLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
						</div>
					) : sslError ? (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							{sslError}
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-center justify-between p-4 bg-gray-50 rounded">
								<div>
									<strong className="text-gray-700">Status:</strong>{" "}
									{sslStatus?.active ? (
										<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
											Active
										</span>
									) : (
										<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
											Inactive
										</span>
									)}
								</div>
								{sslStatus?.certProvider && (
									<div>
										<strong className="text-gray-700">Provider:</strong>{" "}
										<span className="ml-2 text-sm">{sslStatus.certProvider}</span>
									</div>
								)}
							</div>

							{sslStatus?.expiryDate && (
								<div className="flex items-center p-4 bg-gray-50 rounded">
									<strong className="text-gray-700">Expiry Date:</strong>
									<span className="ml-2 text-sm">{sslStatus.expiryDate}</span>
								</div>
							)}

							<div className="pt-4 border-t">
								{sslStatus?.active ? (
									<button
										onClick={handleRenewSSL}
										className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
									>
										Renew Certificate
									</button>
								) : (
									<button
										onClick={handleEnableSSL}
										className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
									>
										Enable Let's Encrypt
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
