import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api.js";
import { createErrorResult } from "../lib/command-utils.js";
import { logger } from "../lib/logger.js";
import {
	type AppDetail as AppDetailData,
	AppDetailSchema,
	type CommandResult,
	CommandResultSchema,
	type ConfigVars,
	ConfigVarsSchema,
	type SSLStatus,
	SSLStatusSchema,
} from "../lib/schemas.js";

type TabType = "overview" | "config" | "domains" | "logs" | "ssl";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ScaleChange {
	processType: string;
	count: number;
}

export function AppDetail() {
	const { name } = useParams<{ name: string }>();
	const navigate = useNavigate();
	const { addToast } = useToast();
	const [app, setApp] = useState<AppDetailData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showActionDialog, setShowActionDialog] = useState(false);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [actionSubmitting, setActionSubmitting] = useState(false);
	const [showScaleDialog, setShowScaleDialog] = useState(false);
	const [pendingScaleChanges, setPendingScaleChanges] = useState<ScaleChange[]>([]);
	const [scaleSubmitting, setScaleSubmitting] = useState(false);
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
	const [configAddSubmitting, setConfigAddSubmitting] = useState(false);
	const [configRemoveSubmitting, setConfigRemoveSubmitting] = useState(false);

	// Delete app state
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [confirmDeleteName, setConfirmDeleteName] = useState("");
	const [deleting, setDeleting] = useState(false);

	// Stop/Start app state
	const [showStopDialog, setShowStopDialog] = useState(false);
	const [showStartDialog, setShowStartDialog] = useState(false);
	const [stopping, setStopping] = useState(false);
	const [starting, setStarting] = useState(false);

	// Domains state
	const [domains, setDomains] = useState<string[]>([]);
	const [domainsLoading, setDomainsLoading] = useState(false);
	const [domainsError, setDomainsError] = useState<string | null>(null);
	const [newDomain, setNewDomain] = useState("");
	const [showDomainRemoveDialog, setShowDomainRemoveDialog] = useState(false);
	const [pendingRemoveDomain, setPendingRemoveDomain] = useState<string | null>(null);
	const [domainAddSubmitting, setDomainAddSubmitting] = useState(false);
	const [domainRemoveSubmitting, setDomainRemoveSubmitting] = useState(false);

	// SSL state
	const [sslStatus, setSslStatus] = useState<SSLStatus | null>(null);
	const [sslLoading, setSslLoading] = useState(false);
	const [sslError, setSslError] = useState<string | null>(null);
	const [sslEmail, setSslEmail] = useState("");
	const [sslSubmitting, setSslSubmitting] = useState(false);

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
	}, [name]);

	useEffect(() => {
		if (activeTab === "logs" && name) {
			connectWebSocket();
		}

		return () => {
			disconnectWebSocket();
		};
	}, [activeTab, name, lineCount]);

	useEffect(() => {
		if (activeTab === "config" && name) {
			fetchConfigVars();
		}
	}, [activeTab, name]);

	useEffect(() => {
		if (activeTab === "domains" && name) {
			fetchDomains();
		}
	}, [activeTab, name]);

	useEffect(() => {
		if (activeTab === "ssl" && name) {
			fetchSSLStatus();
		}
	}, [activeTab, name]);

	useEffect(() => {
		if (autoScroll && logsEndRef.current) {
			logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
		}
	}, [logs, autoScroll]);

	const connectWebSocket = () => {
		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/api/apps/${name}/logs/stream`;

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
	};

	const disconnectWebSocket = () => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
	};

	const fetchAppDetail = async () => {
		if (!name) return;
		try {
			const appData = await apiFetch(`/apps/${encodeURIComponent(name)}`, AppDetailSchema);
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

	const resetActionDialog = () => {
		setShowActionDialog(false);
		setPendingAction(null);
	};

	const confirmAction = async () => {
		if (!pendingAction || !name || actionSubmitting) return;

		setActionSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/${encodeURIComponent(pendingAction)}`,
				CommandResultSchema,
				{
					method: "POST",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", `${pendingAction} completed`, result);
			resetActionDialog();
			fetchAppDetail();
		} catch (err) {
			addToast(
				"error",
				`${pendingAction} failed`,
				createErrorResult(`dokku ps:${pendingAction} ${name}`, err)
			);
			resetActionDialog();
		} finally {
			setActionSubmitting(false);
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
		if (!name || pendingScaleChanges.length === 0 || scaleSubmitting) return;

		setScaleSubmitting(true);
		try {
			for (const change of pendingScaleChanges) {
				try {
					const result = await apiFetch(
						`/apps/${encodeURIComponent(name)}/scale`,
						CommandResultSchema,
						{
							method: "POST",
							body: JSON.stringify({
								processType: change.processType,
								count: change.count,
							}),
						}
					);
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
		} finally {
			setScaleSubmitting(false);
		}
	};

	const fetchConfigVars = async () => {
		if (!name) return;

		setConfigLoading(true);
		setConfigError(null);
		try {
			const config = await apiFetch(`/apps/${encodeURIComponent(name)}/config`, ConfigVarsSchema);
			setConfigVars(config);
		} catch (err) {
			setConfigError(err instanceof Error ? err.message : "Failed to load config vars");
		} finally {
			setConfigLoading(false);
		}
	};

	const resetConfigForm = () => {
		setNewConfigKey("");
		setNewConfigValue("");
	};

	const handleAddConfigVar = async () => {
		if (!name || !newConfigKey || !newConfigValue || configAddSubmitting) return;

		setConfigAddSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/config`,
				CommandResultSchema,
				{
					method: "POST",
					body: JSON.stringify({ key: newConfigKey, value: newConfigValue }),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Config var set", result);
			resetConfigForm();
			fetchConfigVars();
		} catch (err) {
			addToast(
				"error",
				"Failed to set config var",
				createErrorResult(`dokku config:set ${name} ${newConfigKey}=***`, err)
			);
		} finally {
			setConfigAddSubmitting(false);
		}
	};

	const handleRemoveConfigVar = (key: string) => {
		setPendingRemoveKey(key);
		setShowRemoveDialog(true);
	};

	const confirmRemoveConfigVar = async () => {
		if (!name || !pendingRemoveKey || configRemoveSubmitting) return;

		const closeRemoveDialog = () => {
			setShowRemoveDialog(false);
			setPendingRemoveKey(null);
		};

		setConfigRemoveSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/config/${encodeURIComponent(pendingRemoveKey)}`,
				CommandResultSchema,
				{
					method: "DELETE",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Config var removed", result);
			closeRemoveDialog();
			fetchConfigVars();
		} catch (err) {
			addToast(
				"error",
				"Failed to unset config var",
				createErrorResult(`dokku config:unset ${name} ${pendingRemoveKey}`, err)
			);
			closeRemoveDialog();
		} finally {
			setConfigRemoveSubmitting(false);
		}
	};

	const toggleValueVisibility = (key: string) => {
		setVisibleValues((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	const handleDeleteApp = () => {
		setShowDeleteDialog(true);
		setConfirmDeleteName("");
	};

	const confirmDeleteApp = async () => {
		if (!name || confirmDeleteName !== name) return;

		setDeleting(true);
		try {
			const result = await apiFetch(`/apps/${encodeURIComponent(name)}`, CommandResultSchema, {
				method: "DELETE",
				body: JSON.stringify({ confirmName: name }),
			});
			if (result.exitCode === 0) {
				addToast("success", `App ${name} deleted successfully`, result);
				navigate("/apps");
			} else {
				addToast("error", `Failed to delete app: ${result.stderr}`, result);
			}
			setShowDeleteDialog(false);
			setConfirmDeleteName("");
		} catch (err) {
			addToast(
				"error",
				"Failed to delete app",
				createErrorResult(`dokku apps:destroy ${name} --force`, err)
			);
			setShowDeleteDialog(false);
			setConfirmDeleteName("");
		} finally {
			setDeleting(false);
		}
	};

	const handleStopApp = () => {
		setShowStopDialog(true);
	};

	const confirmStopApp = async () => {
		if (!name) return;

		setStopping(true);
		try {
			const result = await apiFetch(`/apps/${encodeURIComponent(name)}/stop`, CommandResultSchema, {
				method: "POST",
			});
			addToast(result.exitCode === 0 ? "success" : "error", "App stopped", result);
			setShowStopDialog(false);
			fetchAppDetail();
		} catch (err) {
			addToast("error", "Failed to stop app", createErrorResult(`dokku ps:stop ${name}`, err));
			setShowStopDialog(false);
		} finally {
			setStopping(false);
		}
	};

	const handleStartApp = () => {
		setShowStartDialog(true);
	};

	const confirmStartApp = async () => {
		if (!name) return;

		setStarting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/start`,
				CommandResultSchema,
				{
					method: "POST",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "App started", result);
			setShowStartDialog(false);
			fetchAppDetail();
		} catch (err) {
			addToast("error", "Failed to start app", createErrorResult(`dokku ps:start ${name}`, err));
			setShowStartDialog(false);
		} finally {
			setStarting(false);
		}
	};

	const fetchDomains = async () => {
		if (!name) return;

		setDomainsLoading(true);
		setDomainsError(null);
		try {
			const domainsData = await apiFetch(
				`/apps/${encodeURIComponent(name)}/domains`,
				z.array(z.string())
			);
			setDomains(domainsData);
		} catch (err) {
			setDomainsError(err instanceof Error ? err.message : "Failed to load domains");
		} finally {
			setDomainsLoading(false);
		}
	};

	const handleAddDomain = async () => {
		if (!name || !newDomain || domainAddSubmitting) return;

		setDomainAddSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/domains`,
				CommandResultSchema,
				{
					method: "POST",
					body: JSON.stringify({ domain: newDomain }),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Domain added", result);
			setNewDomain("");
			fetchDomains();
		} catch (err) {
			addToast(
				"error",
				"Failed to add domain",
				createErrorResult(`dokku domains:add ${name} ${newDomain}`, err)
			);
		} finally {
			setDomainAddSubmitting(false);
		}
	};

	const handleRemoveDomain = (domain: string) => {
		setPendingRemoveDomain(domain);
		setShowDomainRemoveDialog(true);
	};

	const confirmRemoveDomain = async () => {
		if (!name || !pendingRemoveDomain || domainRemoveSubmitting) return;

		const closeDomainRemoveDialog = () => {
			setShowDomainRemoveDialog(false);
			setPendingRemoveDomain(null);
		};

		setDomainRemoveSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${name}/domains/${encodeURIComponent(pendingRemoveDomain)}`,
				CommandResultSchema,
				{
					method: "DELETE",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Domain removed", result);
			closeDomainRemoveDialog();
			fetchDomains();
		} catch (err) {
			addToast(
				"error",
				"Failed to remove domain",
				createErrorResult(`dokku domains:remove ${name} ${pendingRemoveDomain}`, err)
			);
			closeDomainRemoveDialog();
		} finally {
			setDomainRemoveSubmitting(false);
		}
	};

	const fetchSSLStatus = async () => {
		if (!name) return;

		setSslLoading(true);
		setSslError(null);
		try {
			const ssl = await apiFetch(`/apps/${encodeURIComponent(name)}/ssl`, SSLStatusSchema);
			setSslStatus(ssl);
		} catch (err) {
			setSslError(err instanceof Error ? err.message : "Failed to load SSL status");
		} finally {
			setSslLoading(false);
		}
	};

	const handleEnableSSL = async () => {
		if (!name || sslSubmitting) return;

		const normalizedEmail = sslEmail.trim();
		const isValidEmail = EMAIL_PATTERN.test(normalizedEmail);

		if (!normalizedEmail) {
			addToast(
				"error",
				"Failed to enable SSL",
				createErrorResult(
					`dokku letsencrypt:set ${name} email <email>`,
					"Email is required to enable Let's Encrypt"
				)
			);
			return;
		}

		if (!isValidEmail) {
			addToast(
				"error",
				"Failed to enable SSL",
				createErrorResult(
					`dokku letsencrypt:set ${name} email ${normalizedEmail}`,
					"Invalid email address"
				)
			);
			return;
		}

		setSslSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/ssl/enable`,
				CommandResultSchema,
				{
					method: "POST",
					body: JSON.stringify({ email: normalizedEmail }),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "SSL enabled", result);
			fetchSSLStatus();
		} catch (err) {
			addToast(
				"error",
				"Failed to enable SSL",
				createErrorResult(
					`dokku letsencrypt:set ${name} email ${normalizedEmail} && dokku letsencrypt:enable ${name}`,
					err
				)
			);
		} finally {
			setSslSubmitting(false);
		}
	};

	const handleRenewSSL = async () => {
		if (!name || sslSubmitting) return;

		setSslSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/ssl/renew`,
				CommandResultSchema,
				{
					method: "POST",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "SSL renewed", result);
			fetchSSLStatus();
		} catch (err) {
			addToast(
				"error",
				"Failed to renew SSL",
				createErrorResult(`dokku letsencrypt:auto-renew ${name}`, err)
			);
		} finally {
			setSslSubmitting(false);
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
			<div className="flex flex-wrap gap-3 justify-between items-center mb-6">
				<div>
					<h1 className="text-2xl font-bold">{app.name}</h1>
					<div className="mt-2">{getStatusBadge()}</div>
				</div>
				{activeTab === "overview" && (
					<div className="flex gap-2">
						{app.status === "running" && (
							<button
								onClick={handleStopApp}
								className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
							>
								Stop
							</button>
						)}
						{app.status === "stopped" && (
							<button
								onClick={handleStartApp}
								className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
							>
								Start
							</button>
						)}
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
								disabled={actionSubmitting}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmAction}
								disabled={actionSubmitting}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{actionSubmitting ? "Confirming..." : "Confirm"}
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
									if (scaleSubmitting) return;
									setShowScaleDialog(false);
									setPendingScaleChanges([]);
								}}
								disabled={scaleSubmitting}
								className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={confirmScale}
								disabled={scaleSubmitting}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{scaleSubmitting ? "Applying..." : "Confirm"}
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
									if (configRemoveSubmitting) return;
									setShowRemoveDialog(false);
									setPendingRemoveKey(null);
								}}
								disabled={configRemoveSubmitting}
								className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={confirmRemoveConfigVar}
								disabled={configRemoveSubmitting}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
									if (domainRemoveSubmitting) return;
									setShowDomainRemoveDialog(false);
									setPendingRemoveDomain(null);
								}}
								disabled={domainRemoveSubmitting}
								className="px-4 py-2 border rounded hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
							>
								Cancel
							</button>
							<button
								onClick={confirmRemoveDomain}
								disabled={domainRemoveSubmitting}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								Remove
							</button>
						</div>
					</div>
				</div>
			)}

			{showDeleteDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4 text-red-600">Delete App</h2>
						<p className="mb-4">
							This action is <strong>irreversible</strong>. The app <strong>{name}</strong> and all
							its data will be permanently deleted.
						</p>
						<div className="mb-4">
							<label
								htmlFor="confirmDeleteName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Type <strong>{name}</strong> to confirm
							</label>
							<input
								id="confirmDeleteName"
								type="text"
								value={confirmDeleteName}
								onChange={(e) => setConfirmDeleteName(e.target.value)}
								placeholder="Enter app name"
								className="w-full border rounded px-3 py-2"
							/>
						</div>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => {
									setShowDeleteDialog(false);
									setConfirmDeleteName("");
								}}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmDeleteApp}
								disabled={confirmDeleteName !== name || deleting}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{deleting ? "Deleting..." : "Delete App"}
							</button>
						</div>
					</div>
				</div>
			)}

			{showStopDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4 text-orange-600">Stop App</h2>
						<p className="mb-6">
							Are you sure you want to stop <strong>{name}</strong>? The app will not serve requests
							until started again.
						</p>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => setShowStopDialog(false)}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmStopApp}
								disabled={stopping}
								className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{stopping ? "Stopping..." : "Stop App"}
							</button>
						</div>
					</div>
				</div>
			)}

			{showStartDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white rounded p-6 max-w-md w-full">
						<h2 className="text-lg font-semibold mb-4 text-green-600">Start App</h2>
						<p className="mb-6">
							Are you sure you want to start <strong>{name}</strong>?
						</p>
						<div className="flex justify-end space-x-2">
							<button
								onClick={() => setShowStartDialog(false)}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Cancel
							</button>
							<button
								onClick={confirmStartApp}
								disabled={starting}
								className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
							>
								{starting ? "Starting..." : "Start App"}
							</button>
						</div>
					</div>
				</div>
			)}

			<div className="border-b mb-4 overflow-x-auto">
				<nav className="flex space-x-4 min-w-max">
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

						<div className="mt-8 pt-6 border-t border-red-200">
							<div className="border border-red-300 rounded-lg p-4 bg-red-50">
								<h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
								<p className="text-sm text-red-600 mb-4">
									Deleting an app is irreversible. All data, logs, and configurations will be
									permanently removed.
								</p>
								<button
									onClick={handleDeleteApp}
									className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
								>
									Delete App
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{activeTab === "logs" && (
				<div className="bg-white rounded-lg shadow p-6">
					<div className="flex flex-wrap gap-3 justify-between items-center mb-4">
						<h2 className="text-lg font-semibold">Logs</h2>
						<div className="flex flex-wrap items-center gap-3">
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
							{(() => {
								if (logs.length > 0) return logs.join("\n");
								if (connectionStatus === "connected") return "Waiting for logs...";
								return "Not connected";
							})()}
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
								<div className="flex flex-col sm:flex-row gap-2">
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
										disabled={!newConfigKey || !newConfigValue || configAddSubmitting}
										className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
									>
										Set
									</button>
								</div>
							</div>

							{Object.keys(configVars).length > 0 ? (
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200">
										<thead>
											<tr>
												<th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
													Key
												</th>
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
								</div>
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
								<div className="flex flex-col sm:flex-row gap-2">
									<input
										type="text"
										placeholder="example.com"
										value={newDomain}
										onChange={(e) => setNewDomain(e.target.value)}
										className="flex-1 border rounded px-3 py-2"
									/>
									<button
										onClick={handleAddDomain}
										disabled={!newDomain || domainAddSubmitting}
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
										disabled={sslSubmitting}
										className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
									>
										Renew Certificate
									</button>
								) : (
									<div className="space-y-3">
										<div>
											<label
												htmlFor="ssl-email"
												className="block text-sm font-medium text-gray-700 mb-1"
											>
												Let's Encrypt Email
											</label>
											<input
												id="ssl-email"
												type="email"
												value={sslEmail}
												onChange={(event) => setSslEmail(event.target.value)}
												placeholder="you@example.com"
												className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<button
											onClick={handleEnableSSL}
											disabled={sslSubmitting}
											className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
										>
											Enable Let's Encrypt
										</button>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
