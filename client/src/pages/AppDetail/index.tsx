import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useToast } from "../../components/ToastProvider";
import { apiFetch } from "../../lib/api.js";
import { createErrorResult } from "../../lib/command-utils.js";
import { logger } from "../../lib/logger.js";
import {
	type AppDetail as AppDetailData,
	AppDetailSchema,
	type Buildpack,
	BuildpacksResponseSchema,
	type CommandResult,
	CommandResultSchema,
	type ConfigVars,
	ConfigVarsSchema,
	type DeploymentSettings,
	DeploymentSettingsSchema,
	type DockerOptions,
	DockerOptionsSchema,
	type NetworkReport,
	NetworkReportSchema,
	type PortMapping,
	PortsResponseSchema,
	type ProxyReport,
	ProxyReportSchema,
	type SSLStatus,
	SSLStatusSchema,
} from "../../lib/schemas.js";
import { AppDetailHeader } from "./AppDetailHeader.js";
import { AppOverview } from "./AppOverview.js";
import { AppLogs } from "./AppLogs.js";
import { AppConfig } from "./AppConfig.js";
import { AppDomains } from "./AppDomains.js";
import { AppSSL } from "./AppSSL.js";
import { AppDeployment } from "./AppDeployment.js";
import { AppPorts } from "./AppPorts.js";
import { AppBuildpacks } from "./AppBuildpacks.js";
import { AppDockerOptions } from "./AppDockerOptions.js";
import { AppNetwork } from "./AppNetwork.js";
import { ConfirmDialog, DeleteAppDialog, ScaleDialog } from "./Dialogs.js";

type TabType = "overview" | "config" | "domains" | "logs" | "ssl" | "settings";
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
	const [copySuccess, setCopySuccess] = useState<{ remote: boolean; push: boolean }>({
		remote: false,
		push: false,
	});

	const hostname = typeof window !== "undefined" ? window.location.hostname : "";

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

	// Deployment settings state
	const [deploymentSettings, setDeploymentSettings] = useState<DeploymentSettings | null>(null);
	const [deploymentLoading, setDeploymentLoading] = useState(false);
	const [deploymentError, setDeploymentError] = useState<string | null>(null);
	const [deployBranch, setDeployBranch] = useState("");
	const [buildDir, setBuildDir] = useState("");
	const [builder, setBuilder] = useState("");
	const [deploymentSubmitting, setDeploymentSubmitting] = useState(false);

	// Ports state
	const [ports, setPorts] = useState<PortMapping[]>([]);
	const [portsLoading, setPortsLoading] = useState(false);
	const [portsError, setPortsError] = useState<string | null>(null);
	const [newPortScheme, setNewPortScheme] = useState("http");
	const [newHostPort, setNewHostPort] = useState("");
	const [newContainerPort, setNewContainerPort] = useState("");
	const [portAddSubmitting, setPortAddSubmitting] = useState(false);
	const [showClearPortsDialog, setShowClearPortsDialog] = useState(false);
	const [clearPortsSubmitting, setClearPortsSubmitting] = useState(false);
	const [showRemovePortDialog, setShowRemovePortDialog] = useState(false);
	const [pendingRemovePort, setPendingRemovePort] = useState<PortMapping | null>(null);
	const [portRemoveSubmitting, setPortRemoveSubmitting] = useState(false);

	// Proxy state
	const [proxyReport, setProxyReport] = useState<ProxyReport | null>(null);
	const [proxyLoading, setProxyLoading] = useState(false);
	const [proxyError, setProxyError] = useState<string | null>(null);
	const [proxySubmitting, setProxySubmitting] = useState(false);

	// Buildpacks state
	const [buildpacks, setBuildpacks] = useState<Buildpack[]>([]);
	const [buildpacksLoading, setBuildpacksLoading] = useState(false);
	const [buildpacksError, setBuildpacksError] = useState<string | null>(null);
	const [newBuildpackUrl, setNewBuildpackUrl] = useState("");
	const [newBuildpackIndex, setNewBuildpackIndex] = useState("");
	const [buildpackAddSubmitting, setBuildpackAddSubmitting] = useState(false);
	const [showClearBuildpacksDialog, setShowClearBuildpacksDialog] = useState(false);
	const [clearBuildpacksSubmitting, setClearBuildpacksSubmitting] = useState(false);
	const [showRemoveBuildpackDialog, setShowRemoveBuildpackDialog] = useState(false);
	const [pendingRemoveBuildpack, setPendingRemoveBuildpack] = useState<Buildpack | null>(null);
	const [buildpackRemoveSubmitting, setBuildpackRemoveSubmitting] = useState(false);

	// Docker Options state
	const [dockerOptions, setDockerOptions] = useState<DockerOptions | null>(null);
	const [dockerOptionsLoading, setDockerOptionsLoading] = useState(false);
	const [dockerOptionsError, setDockerOptionsError] = useState<string | null>(null);
	const [newDockerOptionPhase, setNewDockerOptionPhase] = useState<"build" | "deploy" | "run">(
		"deploy"
	);
	const [newDockerOption, setNewDockerOption] = useState("");
	const [dockerOptionAddSubmitting, setDockerOptionAddSubmitting] = useState(false);
	const [showClearDockerPhaseDialog, setShowClearDockerPhaseDialog] = useState(false);
	const [pendingClearDockerPhase, setPendingClearDockerPhase] = useState<
		"build" | "deploy" | "run" | null
	>(null);
	const [clearDockerPhaseSubmitting, setClearDockerPhaseSubmitting] = useState(false);
	const [showRemoveDockerOptionDialog, setShowRemoveDockerOptionDialog] = useState(false);
	const [pendingRemoveDockerOption, setPendingRemoveDockerOption] = useState<{
		phase: "build" | "deploy" | "run";
		option: string;
	} | null>(null);
	const [dockerOptionRemoveSubmitting, setDockerOptionRemoveSubmitting] = useState(false);

	// Network state
	const [networkReport, setNetworkReport] = useState<NetworkReport | null>(null);
	const [networkLoading, setNetworkLoading] = useState(false);
	const [networkError, setNetworkError] = useState<string | null>(null);
	const [editingNetworkKey, setEditingNetworkKey] = useState<string | null>(null);
	const [networkEditValue, setNetworkEditValue] = useState("");
	const [networkSubmitting, setNetworkSubmitting] = useState(false);

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
		if (activeTab === "settings" && name) {
			fetchDeploymentSettings();
			fetchPorts();
			fetchProxyReport();
			fetchBuildpacks();
			fetchDockerOptions();
			fetchNetwork();
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

	const handleCopyRemote = async () => {
		if (!app) return;
		const gitRemoteCommand = `git remote add dokku dokku@${hostname}:${app.name}`;
		try {
			await navigator.clipboard.writeText(gitRemoteCommand);
			setCopySuccess({ ...copySuccess, remote: true });
			setTimeout(() => setCopySuccess({ ...copySuccess, remote: false }), 2000);
		} catch {
			// Fallback: user can manually copy
		}
	};

	const handleCopyPush = async () => {
		const gitPushCommand = "git push dokku main";
		try {
			await navigator.clipboard.writeText(gitPushCommand);
			setCopySuccess({ ...copySuccess, push: true });
			setTimeout(() => setCopySuccess({ ...copySuccess, push: false }), 2000);
		} catch {
			// Fallback: user can manually copy
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

	const fetchDeploymentSettings = async () => {
		if (!name) return;

		setDeploymentLoading(true);
		setDeploymentError(null);
		try {
			const settings = await apiFetch(
				`/apps/${encodeURIComponent(name)}/deployment`,
				DeploymentSettingsSchema
			);
			setDeploymentSettings(settings);
			setDeployBranch(settings.deployBranch || "");
			setBuildDir(settings.buildDir || "");
			setBuilder(settings.builder || "");
		} catch (err) {
			setDeploymentError(err instanceof Error ? err.message : "Failed to load deployment settings");
		} finally {
			setDeploymentLoading(false);
		}
	};

	const fetchPorts = async () => {
		if (!name) return;

		setPortsLoading(true);
		setPortsError(null);
		try {
			const response = await apiFetch(
				`/apps/${encodeURIComponent(name)}/ports`,
				PortsResponseSchema
			);
			setPorts(response.ports);
		} catch (err) {
			setPortsError(err instanceof Error ? err.message : "Failed to load ports");
		} finally {
			setPortsLoading(false);
		}
	};

	const fetchProxyReport = async () => {
		if (!name) return;

		setProxyLoading(true);
		setProxyError(null);
		try {
			const proxy = await apiFetch(`/apps/${encodeURIComponent(name)}/proxy`, ProxyReportSchema);
			setProxyReport(proxy);
		} catch (err) {
			setProxyError(err instanceof Error ? err.message : "Failed to load proxy status");
		} finally {
			setProxyLoading(false);
		}
	};

	const handleAddPort = async () => {
		if (!name || !newHostPort || !newContainerPort || portAddSubmitting) return;

		const hostPortNum = parseInt(newHostPort, 10);
		const containerPortNum = parseInt(newContainerPort, 10);

		if (Number.isNaN(hostPortNum) || hostPortNum < 1 || hostPortNum > 65535) {
			addToast("error", "Invalid host port", {
				command: "",
				exitCode: 1,
				stdout: "",
				stderr: "Host port must be between 1 and 65535",
			});
			return;
		}

		if (Number.isNaN(containerPortNum) || containerPortNum < 1 || containerPortNum > 65535) {
			addToast("error", "Invalid container port", {
				command: "",
				exitCode: 1,
				stdout: "",
				stderr: "Container port must be between 1 and 65535",
			});
			return;
		}

		setPortAddSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/ports`,
				CommandResultSchema,
				{
					method: "POST",
					body: JSON.stringify({
						scheme: newPortScheme,
						hostPort: hostPortNum,
						containerPort: containerPortNum,
					}),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Port added", result);
			if (result.exitCode === 0) {
				setNewHostPort("");
				setNewContainerPort("");
				fetchPorts();
			}
		} catch (err) {
			addToast("error", "Failed to add port", createErrorResult(`dokku ports:add ${name}`, err));
		} finally {
			setPortAddSubmitting(false);
		}
	};

	const handleRemovePort = (port: PortMapping) => {
		setPendingRemovePort(port);
		setShowRemovePortDialog(true);
	};

	const confirmRemovePort = async () => {
		if (!name || !pendingRemovePort || portRemoveSubmitting) return;

		setPortRemoveSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/ports`,
				CommandResultSchema,
				{
					method: "DELETE",
					body: JSON.stringify({
						scheme: pendingRemovePort.scheme,
						hostPort: pendingRemovePort.hostPort,
						containerPort: pendingRemovePort.containerPort,
					}),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Port removed", result);
			setShowRemovePortDialog(false);
			setPendingRemovePort(null);
			fetchPorts();
		} catch (err) {
			addToast(
				"error",
				"Failed to remove port",
				createErrorResult(`dokku ports:remove ${name}`, err)
			);
			setShowRemovePortDialog(false);
			setPendingRemovePort(null);
		} finally {
			setPortRemoveSubmitting(false);
		}
	};

	const confirmClearPorts = async () => {
		if (!name || clearPortsSubmitting) return;

		setClearPortsSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/ports/all`,
				CommandResultSchema,
				{
					method: "DELETE",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "All ports cleared", result);
			setShowClearPortsDialog(false);
			fetchPorts();
		} catch (err) {
			addToast(
				"error",
				"Failed to clear ports",
				createErrorResult(`dokku ports:clear ${name}`, err)
			);
			setShowClearPortsDialog(false);
		} finally {
			setClearPortsSubmitting(false);
		}
	};

	const handleEnableProxy = async () => {
		if (!name || proxySubmitting) return;

		setProxySubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/proxy/enable`,
				CommandResultSchema,
				{
					method: "POST",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Proxy enabled", result);
			fetchProxyReport();
		} catch (err) {
			addToast(
				"error",
				"Failed to enable proxy",
				createErrorResult(`dokku proxy:enable ${name}`, err)
			);
		} finally {
			setProxySubmitting(false);
		}
	};

	const handleDisableProxy = async () => {
		if (!name || proxySubmitting) return;

		setProxySubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/proxy/disable`,
				CommandResultSchema,
				{
					method: "POST",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Proxy disabled", result);
			fetchProxyReport();
		} catch (err) {
			addToast(
				"error",
				"Failed to disable proxy",
				createErrorResult(`dokku proxy:disable ${name}`, err)
			);
		} finally {
			setProxySubmitting(false);
		}
	};

	const fetchBuildpacks = async () => {
		if (!name) return;

		setBuildpacksLoading(true);
		setBuildpacksError(null);
		try {
			const response = await apiFetch(
				`/apps/${encodeURIComponent(name)}/buildpacks`,
				BuildpacksResponseSchema
			);
			setBuildpacks(response.buildpacks);
		} catch (err) {
			setBuildpacksError(err instanceof Error ? err.message : "Failed to load buildpacks");
		} finally {
			setBuildpacksLoading(false);
		}
	};

	const handleAddBuildpack = async () => {
		if (!name || !newBuildpackUrl || buildpackAddSubmitting) return;

		setBuildpackAddSubmitting(true);
		try {
			const body: { url: string; index?: number } = { url: newBuildpackUrl };
			if (newBuildpackIndex) {
				const idx = parseInt(newBuildpackIndex, 10);
				if (!Number.isNaN(idx) && idx > 0) {
					body.index = idx;
				}
			}
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/buildpacks`,
				CommandResultSchema,
				{
					method: "POST",
					body: JSON.stringify(body),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Buildpack added", result);
			if (result.exitCode === 0) {
				setNewBuildpackUrl("");
				setNewBuildpackIndex("");
				fetchBuildpacks();
			}
		} catch (err) {
			addToast(
				"error",
				"Failed to add buildpack",
				createErrorResult(`dokku buildpacks:add ${name}`, err)
			);
		} finally {
			setBuildpackAddSubmitting(false);
		}
	};

	const handleRemoveBuildpack = (buildpack: Buildpack) => {
		setPendingRemoveBuildpack(buildpack);
		setShowRemoveBuildpackDialog(true);
	};

	const confirmRemoveBuildpack = async () => {
		if (!name || !pendingRemoveBuildpack || buildpackRemoveSubmitting) return;

		setBuildpackRemoveSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/buildpacks`,
				CommandResultSchema,
				{
					method: "DELETE",
					body: JSON.stringify({ url: pendingRemoveBuildpack.url }),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Buildpack removed", result);
			setShowRemoveBuildpackDialog(false);
			setPendingRemoveBuildpack(null);
			fetchBuildpacks();
		} catch (err) {
			addToast(
				"error",
				"Failed to remove buildpack",
				createErrorResult(`dokku buildpacks:remove ${name}`, err)
			);
			setShowRemoveBuildpackDialog(false);
			setPendingRemoveBuildpack(null);
		} finally {
			setBuildpackRemoveSubmitting(false);
		}
	};

	const confirmClearBuildpacks = async () => {
		if (!name || clearBuildpacksSubmitting) return;

		setClearBuildpacksSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/buildpacks/all`,
				CommandResultSchema,
				{
					method: "DELETE",
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "All buildpacks cleared", result);
			setShowClearBuildpacksDialog(false);
			fetchBuildpacks();
		} catch (err) {
			addToast(
				"error",
				"Failed to clear buildpacks",
				createErrorResult(`dokku buildpacks:clear ${name}`, err)
			);
			setShowClearBuildpacksDialog(false);
		} finally {
			setClearBuildpacksSubmitting(false);
		}
	};

	const handleSaveDeployment = async () => {
		if (!name || deploymentSubmitting) return;

		const changes: Partial<DeploymentSettings> = {};
		if (deployBranch !== (deploymentSettings?.deployBranch || "")) {
			changes.deployBranch = deployBranch;
		}
		if (buildDir !== (deploymentSettings?.buildDir || "")) {
			changes.buildDir = buildDir;
		}
		if (builder !== (deploymentSettings?.builder || "")) {
			changes.builder = builder;
		}

		if (Object.keys(changes).length === 0) {
			return;
		}

		setDeploymentSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/deployment`,
				CommandResultSchema,
				{
					method: "PUT",
					body: JSON.stringify(changes),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Deployment settings updated", result);
			fetchDeploymentSettings();
		} catch (err) {
			addToast("error", "Failed to save deployment settings", createErrorResult("", err));
		} finally {
			setDeploymentSubmitting(false);
		}
	};

	const fetchDockerOptions = async () => {
		if (!name) return;

		setDockerOptionsLoading(true);
		setDockerOptionsError(null);
		try {
			const options = await apiFetch(
				`/apps/${encodeURIComponent(name)}/docker-options`,
				DockerOptionsSchema
			);
			setDockerOptions(options);
		} catch (err) {
			setDockerOptionsError(err instanceof Error ? err.message : "Failed to load docker options");
		} finally {
			setDockerOptionsLoading(false);
		}
	};

	const handleAddDockerOption = async () => {
		if (!name || !newDockerOption || dockerOptionAddSubmitting) return;

		setDockerOptionAddSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/docker-options`,
				CommandResultSchema,
				{
					method: "POST",
					body: JSON.stringify({ phase: newDockerOptionPhase, option: newDockerOption }),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Docker option added", result);
			if (result.exitCode === 0) {
				setNewDockerOption("");
				fetchDockerOptions();
			}
		} catch (err) {
			addToast(
				"error",
				"Failed to add docker option",
				createErrorResult(`dokku docker-options:add ${name}`, err)
			);
		} finally {
			setDockerOptionAddSubmitting(false);
		}
	};

	const handleRemoveDockerOption = (phase: "build" | "deploy" | "run", option: string) => {
		setPendingRemoveDockerOption({ phase, option });
		setShowRemoveDockerOptionDialog(true);
	};

	const confirmRemoveDockerOption = async () => {
		if (!name || !pendingRemoveDockerOption || dockerOptionRemoveSubmitting) return;

		setDockerOptionRemoveSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/docker-options`,
				CommandResultSchema,
				{
					method: "DELETE",
					body: JSON.stringify({
						phase: pendingRemoveDockerOption.phase,
						option: pendingRemoveDockerOption.option,
					}),
				}
			);
			addToast(result.exitCode === 0 ? "success" : "error", "Docker option removed", result);
			setShowRemoveDockerOptionDialog(false);
			setPendingRemoveDockerOption(null);
			fetchDockerOptions();
		} catch (err) {
			addToast(
				"error",
				"Failed to remove docker option",
				createErrorResult(`dokku docker-options:remove ${name}`, err)
			);
			setShowRemoveDockerOptionDialog(false);
			setPendingRemoveDockerOption(null);
		} finally {
			setDockerOptionRemoveSubmitting(false);
		}
	};

	const handleClearDockerPhase = (phase: "build" | "deploy" | "run") => {
		setPendingClearDockerPhase(phase);
		setShowClearDockerPhaseDialog(true);
	};

	const confirmClearDockerPhase = async () => {
		if (!name || !pendingClearDockerPhase || clearDockerPhaseSubmitting) return;

		setClearDockerPhaseSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/docker-options`,
				CommandResultSchema,
				{
					method: "DELETE",
					body: JSON.stringify({ phase: pendingClearDockerPhase }),
				}
			);
			addToast(
				result.exitCode === 0 ? "success" : "error",
				`${pendingClearDockerPhase} docker options cleared`,
				result
			);
			setShowClearDockerPhaseDialog(false);
			setPendingClearDockerPhase(null);
			fetchDockerOptions();
		} catch (err) {
			addToast(
				"error",
				"Failed to clear docker options",
				createErrorResult(`dokku docker-options:clear ${name}`, err)
			);
			setShowClearDockerPhaseDialog(false);
			setPendingClearDockerPhase(null);
		} finally {
			setClearDockerPhaseSubmitting(false);
		}
	};

	const fetchNetwork = async () => {
		if (!name) return;

		setNetworkLoading(true);
		setNetworkError(null);
		try {
			const report = await apiFetch(
				`/apps/${encodeURIComponent(name)}/network`,
				NetworkReportSchema
			);
			setNetworkReport(report);
		} catch (err) {
			setNetworkError(err instanceof Error ? err.message : "Failed to load network settings");
		} finally {
			setNetworkLoading(false);
		}
	};

	const handleStartEditNetwork = (key: string, currentValue: string) => {
		setEditingNetworkKey(key);
		setNetworkEditValue(currentValue);
	};

	const handleCancelEditNetwork = () => {
		setEditingNetworkKey(null);
		setNetworkEditValue("");
	};

	const handleSaveNetworkProperty = async (key: string) => {
		if (!name || networkSubmitting) return;

		setNetworkSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/network`,
				CommandResultSchema,
				{
					method: "PUT",
					body: JSON.stringify({ key, value: networkEditValue }),
				}
			);
			addToast(
				result.exitCode === 0 ? "success" : "error",
				result.exitCode === 0 ? "Network setting saved" : "Failed to save network setting",
				result
			);
			if (result.exitCode === 0) {
				setEditingNetworkKey(null);
				setNetworkEditValue("");
				fetchNetwork();
			}
		} catch (err) {
			addToast(
				"error",
				"Failed to save network setting",
				createErrorResult(`dokku network:set ${name} ${key}`, err)
			);
		} finally {
			setNetworkSubmitting(false);
		}
	};

	const handleClearNetworkProperty = async (key: string) => {
		if (!name || networkSubmitting) return;

		setNetworkSubmitting(true);
		try {
			const result = await apiFetch(
				`/apps/${encodeURIComponent(name)}/network`,
				CommandResultSchema,
				{
					method: "DELETE",
					body: JSON.stringify({ key }),
				}
			);
			addToast(
				result.exitCode === 0 ? "success" : "error",
				result.exitCode === 0 ? "Network setting cleared" : "Failed to clear network setting",
				result
			);
			if (result.exitCode === 0) {
				fetchNetwork();
			}
		} catch (err) {
			addToast(
				"error",
				"Failed to clear network setting",
				createErrorResult(`dokku network:set ${name} ${key}`, err)
			);
		} finally {
			setNetworkSubmitting(false);
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
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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

	return (
		<div>
			{activeTab === "overview" && (
				<AppDetailHeader
					appName={app.name}
					status={app.status}
					onStop={handleStopApp}
					onStart={handleStartApp}
					onRestart={() => handleAction("restart")}
					onRebuild={() => handleAction("rebuild")}
				/>
			)}

			{/* Action Dialog */}
			<ConfirmDialog
				visible={showActionDialog}
				title="Confirm Action"
				onClose={resetActionDialog}
				onConfirm={confirmAction}
				submitting={actionSubmitting}
			>
				<p>
					Are you sure you want to {pendingAction} <strong>{app.name}</strong>?
				</p>
			</ConfirmDialog>

			{/* Scale Dialog */}
			<ScaleDialog
				visible={showScaleDialog}
				appName={app.name}
				scaleChanges={pendingScaleChanges}
				onClose={() => setShowScaleDialog(false)}
				onConfirm={confirmScale}
				submitting={scaleSubmitting}
			/>

			{/* Config Remove Dialog */}
			<ConfirmDialog
				visible={showRemoveDialog}
				title="Confirm Remove"
				onClose={() => {
					if (configRemoveSubmitting) return;
					setShowRemoveDialog(false);
					setPendingRemoveKey(null);
				}}
				onConfirm={confirmRemoveConfigVar}
				submitting={configRemoveSubmitting}
				isDestructive
				confirmText="Remove"
			>
				<p>
					Are you sure you want to remove environment variable <strong>{pendingRemoveKey}</strong>?
				</p>
			</ConfirmDialog>

			{/* Delete App Dialog */}
			<DeleteAppDialog
				visible={showDeleteDialog}
				appName={name || ""}
				confirmName={confirmDeleteName}
				onClose={() => {
					setShowDeleteDialog(false);
					setConfirmDeleteName("");
				}}
				onConfirm={confirmDeleteApp}
				onConfirmNameChange={setConfirmDeleteName}
				submitting={deleting}
			/>

			{/* Stop Dialog */}
			<ConfirmDialog
				visible={showStopDialog}
				title="Stop App"
				onClose={() => setShowStopDialog(false)}
				onConfirm={confirmStopApp}
				submitting={stopping}
				confirmText="Stop App"
			>
				<p>
					Are you sure you want to stop <strong>{name}</strong>? The app will not serve requests
					until started again.
				</p>
			</ConfirmDialog>

			{/* Start Dialog */}
			<ConfirmDialog
				visible={showStartDialog}
				title="Start App"
				onClose={() => setShowStartDialog(false)}
				onConfirm={confirmStartApp}
				submitting={starting}
				confirmText="Start App"
			>
				<p>
					Are you sure you want to start <strong>{name}</strong>?
				</p>
			</ConfirmDialog>

			{/* Domain Remove Dialog */}
			<ConfirmDialog
				visible={showDomainRemoveDialog}
				title="Confirm Remove"
				onClose={() => {
					if (domainRemoveSubmitting) return;
					setShowDomainRemoveDialog(false);
					setPendingRemoveDomain(null);
				}}
				onConfirm={confirmRemoveDomain}
				submitting={domainRemoveSubmitting}
				isDestructive
				confirmText="Remove"
			>
				<p>
					Are you sure you want to remove domain <strong>{pendingRemoveDomain}</strong>?
				</p>
			</ConfirmDialog>

			{/* Port Remove Dialog */}
			{pendingRemovePort && (
				<ConfirmDialog
					visible={showRemovePortDialog}
					title="Confirm Remove Port"
					onClose={() => {
						setShowRemovePortDialog(false);
						setPendingRemovePort(null);
					}}
					onConfirm={confirmRemovePort}
					submitting={portRemoveSubmitting}
					isDestructive
					confirmText="Remove"
				>
					<p>
						Are you sure you want to remove port mapping{" "}
						<strong>
							{pendingRemovePort.scheme}:{pendingRemovePort.hostPort}:
							{pendingRemovePort.containerPort}
						</strong>
						?
					</p>
				</ConfirmDialog>
			)}

			{/* Clear Ports Dialog */}
			<ConfirmDialog
				visible={showClearPortsDialog}
				title="Clear All Ports"
				onClose={() => setShowClearPortsDialog(false)}
				onConfirm={confirmClearPorts}
				submitting={clearPortsSubmitting}
				isDestructive
				confirmText="Clear All"
			>
				<p>
					Are you sure you want to remove all port mappings for <strong>{name}</strong>? This will
					remove all custom port configurations.
				</p>
			</ConfirmDialog>

			{/* Buildpack Remove Dialog */}
			{pendingRemoveBuildpack && (
				<ConfirmDialog
					visible={showRemoveBuildpackDialog}
					title="Confirm Remove Buildpack"
					onClose={() => {
						setShowRemoveBuildpackDialog(false);
						setPendingRemoveBuildpack(null);
					}}
					onConfirm={confirmRemoveBuildpack}
					submitting={buildpackRemoveSubmitting}
					isDestructive
					confirmText="Remove"
				>
					<p>
						Are you sure you want to remove buildpack <strong>{pendingRemoveBuildpack.url}</strong>?
					</p>
				</ConfirmDialog>
			)}

			{/* Clear Buildpacks Dialog */}
			<ConfirmDialog
				visible={showClearBuildpacksDialog}
				title="Clear All Buildpacks"
				onClose={() => setShowClearBuildpacksDialog(false)}
				onConfirm={confirmClearBuildpacks}
				submitting={clearBuildpacksSubmitting}
				isDestructive
				confirmText="Clear All"
			>
				<p>
					Are you sure you want to remove all custom buildpacks for <strong>{name}</strong>? This
					will revert to auto-detected buildpacks.
				</p>
			</ConfirmDialog>

			{/* Docker Option Remove Dialog */}
			{pendingRemoveDockerOption && (
				<ConfirmDialog
					visible={showRemoveDockerOptionDialog}
					title="Confirm Remove Docker Option"
					onClose={() => {
						setShowRemoveDockerOptionDialog(false);
						setPendingRemoveDockerOption(null);
					}}
					onConfirm={confirmRemoveDockerOption}
					submitting={dockerOptionRemoveSubmitting}
					isDestructive
					confirmText="Remove"
				>
					<p>
						Are you sure you want to remove the docker option{" "}
						<strong className="font-mono">{pendingRemoveDockerOption.option}</strong> from{" "}
						<strong>{pendingRemoveDockerOption.phase}</strong> phase?
					</p>
				</ConfirmDialog>
			)}

			{/* Clear Docker Phase Dialog */}
			{pendingClearDockerPhase && (
				<ConfirmDialog
					visible={showClearDockerPhaseDialog}
					title="Clear Docker Options"
					onClose={() => setShowClearDockerPhaseDialog(false)}
					onConfirm={confirmClearDockerPhase}
					submitting={clearDockerPhaseSubmitting}
					isDestructive
					confirmText="Clear"
				>
					<p>
						Are you sure you want to clear all docker options for the{" "}
						<strong>{pendingClearDockerPhase}</strong> phase on <strong>{name}</strong>?
					</p>
				</ConfirmDialog>
			)}

			{/* Tab Navigation */}
			<div className="border-b mb-4 overflow-x-auto">
				<nav className="flex space-x-4 min-w-max">
					<button
						onClick={() => setActiveTab("overview")}
						className={`pb-2 px-2 ${activeTab === "overview" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
						type="button"
					>
						Overview
					</button>
					<button
						onClick={() => setActiveTab("config")}
						className={`pb-2 px-2 ${activeTab === "config" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
						type="button"
					>
						Config
					</button>
					<button
						onClick={() => setActiveTab("domains")}
						className={`pb-2 px-2 ${activeTab === "domains" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
						type="button"
					>
						Domains
					</button>
					<button
						onClick={() => setActiveTab("logs")}
						className={`pb-2 px-2 ${activeTab === "logs" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
						type="button"
					>
						Logs
					</button>
					<button
						onClick={() => setActiveTab("ssl")}
						className={`pb-2 px-2 ${activeTab === "ssl" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
						type="button"
					>
						SSL
					</button>
					<button
						onClick={() => setActiveTab("settings")}
						className={`pb-2 px-2 ${activeTab === "settings" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
						type="button"
					>
						Settings
					</button>
				</nav>
			</div>

			{activeTab === "overview" && (
				<AppOverview
					app={app}
					hostname={hostname}
					copySuccess={copySuccess}
					scaleChanges={scaleChanges}
					onCopyRemote={handleCopyRemote}
					onCopyPush={handleCopyPush}
					onScaleChange={handleScaleChange}
					onApplyScale={handleApplyScale}
					onDeleteApp={handleDeleteApp}
				/>
			)}

			{activeTab === "logs" && (
				<AppLogs
					logs={logs}
					connectionStatus={connectionStatus}
					lineCount={lineCount}
					autoScroll={autoScroll}
					logsEndRef={logsEndRef}
					onLineCountChange={setLineCount}
					onAutoScrollToggle={() => setAutoScroll(!autoScroll)}
				/>
			)}

			{activeTab === "config" && (
				<AppConfig
					configVars={configVars}
					loading={configLoading}
					error={configError}
					newKey={newConfigKey}
					newValue={newConfigValue}
					submitting={configAddSubmitting}
					visibleValues={visibleValues}
					onKeyChange={setNewConfigKey}
					onValueChange={setNewConfigValue}
					onAdd={handleAddConfigVar}
					onRemove={handleRemoveConfigVar}
					onToggleVisibility={toggleValueVisibility}
				/>
			)}

			{activeTab === "domains" && (
				<AppDomains
					domains={domains}
					loading={domainsLoading}
					error={domainsError}
					newDomain={newDomain}
					submitting={domainAddSubmitting}
					onDomainChange={setNewDomain}
					onAdd={handleAddDomain}
					onRemove={handleRemoveDomain}
				/>
			)}

			{activeTab === "ssl" && (
				<AppSSL
					sslStatus={sslStatus}
					loading={sslLoading}
					error={sslError}
					email={sslEmail}
					submitting={sslSubmitting}
					onEmailChange={setSslEmail}
					onEnable={handleEnableSSL}
					onRenew={handleRenewSSL}
				/>
			)}

			{activeTab === "settings" && (
				<div className="space-y-6">
					<AppDeployment
						settings={deploymentSettings}
						loading={deploymentLoading}
						error={deploymentError}
						deployBranch={deployBranch}
						buildDir={buildDir}
						builder={builder}
						submitting={deploymentSubmitting}
						onDeployBranchChange={setDeployBranch}
						onBuildDirChange={setBuildDir}
						onBuilderChange={setBuilder}
						onSave={handleSaveDeployment}
					/>

					<AppPorts
						ports={ports}
						proxyReport={proxyReport}
						loading={portsLoading || proxyLoading}
						error={portsError || proxyError}
						newScheme={newPortScheme}
						newHostPort={newHostPort}
						newContainerPort={newContainerPort}
						submitting={portAddSubmitting}
						proxySubmitting={proxySubmitting}
						onSchemeChange={setNewPortScheme}
						onHostPortChange={setNewHostPort}
						onContainerPortChange={setNewContainerPort}
						onAdd={handleAddPort}
						onRemove={handleRemovePort}
						onClearAll={() => setShowClearPortsDialog(true)}
						onEnableProxy={handleEnableProxy}
						onDisableProxy={handleDisableProxy}
					/>

					<AppBuildpacks
						buildpacks={buildpacks}
						loading={buildpacksLoading}
						error={buildpacksError}
						newUrl={newBuildpackUrl}
						newIndex={newBuildpackIndex}
						submitting={buildpackAddSubmitting}
						clearSubmitting={clearBuildpacksSubmitting}
						onUrlChange={setNewBuildpackUrl}
						onIndexChange={setNewBuildpackIndex}
						onAdd={handleAddBuildpack}
						onRemove={handleRemoveBuildpack}
						onClearAll={() => setShowClearBuildpacksDialog(true)}
					/>

					<AppDockerOptions
						dockerOptions={dockerOptions}
						loading={dockerOptionsLoading}
						error={dockerOptionsError}
						newPhase={newDockerOptionPhase}
						newOption={newDockerOption}
						addSubmitting={dockerOptionAddSubmitting}
						clearSubmitting={(phase) =>
							phase === pendingClearDockerPhase ? clearDockerPhaseSubmitting : false
						}
						onPhaseChange={setNewDockerOptionPhase}
						onOptionChange={setNewDockerOption}
						onAdd={handleAddDockerOption}
						onRemove={handleRemoveDockerOption}
						onClearPhase={handleClearDockerPhase}
					/>

					<AppNetwork
						networkReport={networkReport}
						loading={networkLoading}
						error={networkError}
						submitting={networkSubmitting}
						editingKey={editingNetworkKey}
						editValue={networkEditValue}
						onStartEdit={handleStartEditNetwork}
						onCancelEdit={handleCancelEditNetwork}
						onSave={handleSaveNetworkProperty}
						onClear={handleClearNetworkProperty}
						onValueChange={setNetworkEditValue}
					/>
				</div>
			)}
		</div>
	);
}
