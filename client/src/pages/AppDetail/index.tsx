import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "../../components/ToastProvider";
import { useStreamingAction } from "../../hooks/use-streaming-action.js";
import { apiFetch } from "../../lib/api.js";
import { useAuth } from "../../contexts/auth-context.js";
import { createErrorResult } from "../../lib/command-utils.js";
import { logger } from "../../lib/logger.js";
import { queryKeys } from "../../lib/query-keys.js";
import {
	AppDetailSchema,
	type Buildpack,
	BuildpacksResponseSchema,
	type CommandResult,
	CommandResultSchema,
	ConfigVarsSchema,
	type DeploymentSettings,
	DeploymentSettingsSchema,
	DockerOptionsSchema,
	GitInfoSchema,
	NetworkReportSchema,
	type PortMapping,
	PortsResponseSchema,
	ProxyReportSchema,
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
import { AppGit } from "./AppGit.js";
import { ConfirmDialog, DeleteAppDialog, ScaleDialog } from "./Dialogs.js";
import type { TabType } from "./types.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ScaleChange {
	processType: string;
	count: number;
}

export function AppDetail() {
	const { name } = useParams<{ name: string }>();
	const navigate = useNavigate();
	const { addToast } = useToast();
	const { execute: streamAction } = useStreamingAction();
	const { canModify } = useAuth();
	const {
		data: app,
		isLoading: loading,
		error: queryError,
		refetch,
	} = useQuery({
		queryKey: queryKeys.apps.detail(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}`, AppDetailSchema),
		enabled: !!name,
	});

	const error = queryError?.message || null;

	const [activeTab, setActiveTab] = useState<TabType>("overview");

	// Config vars query
	const {
		data: configVars,
		isLoading: configLoading,
		error: configErrorData,
		refetch: refetchConfigVars,
	} = useQuery({
		queryKey: queryKeys.apps.config(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}/config`, ConfigVarsSchema),
		enabled: activeTab === "config" && !!name && canModify,
	});

	const configError = configErrorData?.message || null;

	const [showActionDialog, setShowActionDialog] = useState(false);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [actionSubmitting, setActionSubmitting] = useState(false);
	const [showScaleDialog, setShowScaleDialog] = useState(false);
	const [pendingScaleChanges, setPendingScaleChanges] = useState<ScaleChange[]>([]);
	const [scaleSubmitting, setScaleSubmitting] = useState(false);
	const [scaleChanges, setScaleChanges] = useState<Record<string, number>>({});
	const [copySuccess, setCopySuccess] = useState<{ remote: boolean; push: boolean }>({
		remote: false,
		push: false,
	});

	const hostname = typeof window !== "undefined" ? window.location.hostname : "";

	// Config vars state
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

	// Unlock app state
	const [showUnlockDialog, setShowUnlockDialog] = useState(false);
	const [unlocking, setUnlocking] = useState(false);

	// Domains query
	const {
		data: domainsData,
		isLoading: domainsLoading,
		error: domainsErrorData,
		refetch: refetchDomains,
	} = useQuery({
		queryKey: queryKeys.apps.domains(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}/domains`, z.array(z.string())),
		enabled: activeTab === "domains" && !!name,
	});
	const domains = domainsData ?? [];
	const domainsError = domainsErrorData?.message || null;

	// Domains state
	const [newDomain, setNewDomain] = useState("");
	const [showDomainRemoveDialog, setShowDomainRemoveDialog] = useState(false);
	const [pendingRemoveDomain, setPendingRemoveDomain] = useState<string | null>(null);
	const [domainAddSubmitting, setDomainAddSubmitting] = useState(false);
	const [domainRemoveSubmitting, setDomainRemoveSubmitting] = useState(false);

	// SSL state
	const [sslEmail, setSslEmail] = useState("");
	const [sslSubmitting, setSslSubmitting] = useState(false);
	const {
		data: sslStatus,
		isLoading: sslLoading,
		error: sslErrorData,
		refetch: refetchSsl,
	} = useQuery({
		queryKey: queryKeys.apps.ssl(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}/ssl`, SSLStatusSchema),
		enabled: activeTab === "ssl" && !!name,
	});
	const sslError = sslErrorData?.message || null;

	const settingsEnabled = activeTab === "settings" && !!name;

	// Deployment settings query
	const {
		data: deploymentSettings,
		isLoading: deploymentLoading,
		error: deploymentErrorData,
		refetch: refetchDeploymentSettings,
	} = useQuery({
		queryKey: queryKeys.apps.deployment(name || ""),
		queryFn: () =>
			apiFetch(`/apps/${encodeURIComponent(name || "")}/deployment`, DeploymentSettingsSchema),
		enabled: settingsEnabled,
	});
	const deploymentError = deploymentErrorData?.message || null;

	// Initialize deployment form state when data loads
	const [deployBranch, setDeployBranch] = useState("");
	const [buildDir, setBuildDir] = useState("");
	const [builder, setBuilder] = useState("");
	const [deploymentSubmitting, setDeploymentSubmitting] = useState(false);

	// Ports query
	const {
		data: portsData,
		isLoading: portsLoading,
		error: portsErrorData,
		refetch: refetchPorts,
	} = useQuery({
		queryKey: queryKeys.apps.ports(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}/ports`, PortsResponseSchema),
		enabled: settingsEnabled,
	});
	const ports = portsData?.ports ?? [];
	const portsError = portsErrorData?.message || null;
	const [newPortScheme, setNewPortScheme] = useState("http");
	const [newHostPort, setNewHostPort] = useState("");
	const [newContainerPort, setNewContainerPort] = useState("");
	const [portAddSubmitting, setPortAddSubmitting] = useState(false);
	const [showClearPortsDialog, setShowClearPortsDialog] = useState(false);
	const [clearPortsSubmitting, setClearPortsSubmitting] = useState(false);
	const [showRemovePortDialog, setShowRemovePortDialog] = useState(false);
	const [pendingRemovePort, setPendingRemovePort] = useState<PortMapping | null>(null);
	const [portRemoveSubmitting, setPortRemoveSubmitting] = useState(false);

	// Proxy query
	const {
		data: proxyReport,
		isLoading: proxyLoading,
		error: proxyErrorData,
		refetch: refetchProxyReport,
	} = useQuery({
		queryKey: queryKeys.apps.proxy(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}/proxy`, ProxyReportSchema),
		enabled: settingsEnabled,
	});
	const proxyError = proxyErrorData?.message || null;
	const [proxySubmitting, setProxySubmitting] = useState(false);

	// Buildpacks query
	const {
		data: buildpacksData,
		isLoading: buildpacksLoading,
		error: buildpacksErrorData,
		refetch: refetchBuildpacks,
	} = useQuery({
		queryKey: queryKeys.apps.buildpacks(name || ""),
		queryFn: () =>
			apiFetch(`/apps/${encodeURIComponent(name || "")}/buildpacks`, BuildpacksResponseSchema),
		enabled: settingsEnabled,
	});
	const buildpacks = buildpacksData?.buildpacks ?? [];
	const buildpacksError = buildpacksErrorData?.message || null;
	const [newBuildpackUrl, setNewBuildpackUrl] = useState("");
	const [newBuildpackIndex, setNewBuildpackIndex] = useState("");
	const [buildpackAddSubmitting, setBuildpackAddSubmitting] = useState(false);
	const [showClearBuildpacksDialog, setShowClearBuildpacksDialog] = useState(false);
	const [clearBuildpacksSubmitting, setClearBuildpacksSubmitting] = useState(false);
	const [showRemoveBuildpackDialog, setShowRemoveBuildpackDialog] = useState(false);
	const [pendingRemoveBuildpack, setPendingRemoveBuildpack] = useState<Buildpack | null>(null);
	const [buildpackRemoveSubmitting, setBuildpackRemoveSubmitting] = useState(false);

	// Docker Options query
	const {
		data: dockerOptions,
		isLoading: dockerOptionsLoading,
		error: dockerOptionsErrorData,
		refetch: refetchDockerOptions,
	} = useQuery({
		queryKey: queryKeys.apps.dockerOptions(name || ""),
		queryFn: () =>
			apiFetch(`/apps/${encodeURIComponent(name || "")}/docker-options`, DockerOptionsSchema),
		enabled: settingsEnabled,
	});
	const dockerOptionsError = dockerOptionsErrorData?.message || null;
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

	// Network query
	const {
		data: networkReport,
		isLoading: networkLoading,
		error: networkErrorData,
		refetch: refetchNetwork,
	} = useQuery({
		queryKey: queryKeys.apps.network(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}/network`, NetworkReportSchema),
		enabled: settingsEnabled,
	});
	const networkError = networkErrorData?.message || null;
	const [editingNetworkKey, setEditingNetworkKey] = useState<string | null>(null);
	const [networkEditValue, setNetworkEditValue] = useState("");
	const [networkSubmitting, setNetworkSubmitting] = useState(false);

	// Git info query
	const {
		data: gitInfo,
		isLoading: gitLoading,
		error: gitErrorData,
		refetch: refetchGitInfo,
	} = useQuery({
		queryKey: queryKeys.apps.git(name || ""),
		queryFn: () => apiFetch(`/apps/${encodeURIComponent(name || "")}/git`, GitInfoSchema),
		enabled: activeTab === "git" && !!name,
	});
	const gitError = gitErrorData?.message || null;
	const [gitSyncing, setGitSyncing] = useState(false);

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
		if (activeTab === "logs" && name) {
			connectWebSocket();
		}

		return () => {
			disconnectWebSocket();
		};
	}, [activeTab, name, lineCount]);

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

		await streamAction(
			`/apps/${encodeURIComponent(name)}/${encodeURIComponent(pendingAction)}`,
			pendingAction,
			{
				onSuccess: () => void refetch(),
				onError: () => void refetch(),
			}
		);

		resetActionDialog();
		setActionSubmitting(false);
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
			void refetch();
		} finally {
			setScaleSubmitting(false);
		}
	};

	const resetConfigForm = () => {
		setNewConfigKey("");
		setNewConfigValue("");
	};

	const handleAddConfigVar = async () => {
		if (!name || !newConfigKey || !newConfigValue || configAddSubmitting) return;

		setConfigAddSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/config`, "config:set", {
			method: "POST",
			body: JSON.stringify({ key: newConfigKey, value: newConfigValue }),
			onSuccess: () => {
				resetConfigForm();
				void refetchConfigVars();
			},
		});

		setConfigAddSubmitting(false);
	};

	const handleRemoveConfigVar = (key: string) => {
		setPendingRemoveKey(key);
		setShowRemoveDialog(true);
	};

	const confirmRemoveConfigVar = async () => {
		if (!name || !pendingRemoveKey || configRemoveSubmitting) return;

		setConfigRemoveSubmitting(true);

		await streamAction(
			`/apps/${encodeURIComponent(name)}/config/${encodeURIComponent(pendingRemoveKey)}`,
			"config:unset",
			{
				method: "DELETE",
				onSuccess: () => {
					setShowRemoveDialog(false);
					setPendingRemoveKey(null);
					void refetchConfigVars();
				},
				onError: () => {
					setShowRemoveDialog(false);
					setPendingRemoveKey(null);
				},
			}
		);

		setConfigRemoveSubmitting(false);
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

		await streamAction(`/apps/${encodeURIComponent(name)}/stop`, "stop", {
			onSuccess: () => void refetch(),
			onError: () => void refetch(),
		});

		setShowStopDialog(false);
		setStopping(false);
	};

	const handleStartApp = () => {
		setShowStartDialog(true);
	};

	const confirmStartApp = async () => {
		if (!name) return;

		setStarting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/start`, "start", {
			onSuccess: () => void refetch(),
			onError: () => void refetch(),
		});

		setShowStartDialog(false);
		setStarting(false);
	};

	const handleUnlockApp = () => {
		setShowUnlockDialog(true);
	};

	const confirmUnlockApp = async () => {
		if (!name) return;

		setUnlocking(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/unlock`, "unlock", {
			onSuccess: () => void refetch(),
			onError: () => void refetch(),
		});

		setShowUnlockDialog(false);
		setUnlocking(false);
	};

	const handleAddDomain = async () => {
		if (!name || !newDomain || domainAddSubmitting) return;

		setDomainAddSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/domains`, "domain:add", {
			method: "POST",
			body: JSON.stringify({ domain: newDomain }),
			onSuccess: () => {
				setNewDomain("");
				void refetchDomains();
			},
		});

		setDomainAddSubmitting(false);
	};

	const handleRemoveDomain = (domain: string) => {
		setPendingRemoveDomain(domain);
		setShowDomainRemoveDialog(true);
	};

	const confirmRemoveDomain = async () => {
		if (!name || !pendingRemoveDomain || domainRemoveSubmitting) return;

		setDomainRemoveSubmitting(true);

		await streamAction(
			`/apps/${name}/domains/${encodeURIComponent(pendingRemoveDomain)}`,
			"domain:remove",
			{
				method: "DELETE",
				onSuccess: () => {
					setShowDomainRemoveDialog(false);
					setPendingRemoveDomain(null);
					void refetchDomains();
				},
				onError: () => {
					setShowDomainRemoveDialog(false);
					setPendingRemoveDomain(null);
				},
			}
		);

		setDomainRemoveSubmitting(false);
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

		await streamAction(`/apps/${encodeURIComponent(name)}/ports`, "port:add", {
			method: "POST",
			body: JSON.stringify({
				scheme: newPortScheme,
				hostPort: hostPortNum,
				containerPort: containerPortNum,
			}),
			onSuccess: () => {
				setNewHostPort("");
				setNewContainerPort("");
				void refetchPorts();
			},
		});

		setPortAddSubmitting(false);
	};

	const handleRemovePort = (port: PortMapping) => {
		setPendingRemovePort(port);
		setShowRemovePortDialog(true);
	};

	const confirmRemovePort = async () => {
		if (!name || !pendingRemovePort || portRemoveSubmitting) return;

		setPortRemoveSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/ports`, "port:remove", {
			method: "DELETE",
			body: JSON.stringify({
				scheme: pendingRemovePort.scheme,
				hostPort: pendingRemovePort.hostPort,
				containerPort: pendingRemovePort.containerPort,
			}),
			onSuccess: () => {
				setShowRemovePortDialog(false);
				setPendingRemovePort(null);
				void refetchPorts();
			},
			onError: () => {
				setShowRemovePortDialog(false);
				setPendingRemovePort(null);
			},
		});

		setPortRemoveSubmitting(false);
	};

	const confirmClearPorts = async () => {
		if (!name || clearPortsSubmitting) return;

		setClearPortsSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/ports/all`, "ports:clear", {
			method: "DELETE",
			onSuccess: () => {
				setShowClearPortsDialog(false);
				void refetchPorts();
			},
			onError: () => {
				setShowClearPortsDialog(false);
			},
		});

		setClearPortsSubmitting(false);
	};

	const handleEnableProxy = async () => {
		if (!name || proxySubmitting) return;

		setProxySubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/proxy/enable`, "proxy:enable", {
			onSuccess: () => void refetchProxyReport(),
			onError: () => void refetchProxyReport(),
		});

		setProxySubmitting(false);
	};

	const handleDisableProxy = async () => {
		if (!name || proxySubmitting) return;

		setProxySubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/proxy/disable`, "proxy:disable", {
			onSuccess: () => void refetchProxyReport(),
			onError: () => void refetchProxyReport(),
		});

		setProxySubmitting(false);
	};

	const handleAddBuildpack = async () => {
		if (!name || !newBuildpackUrl || buildpackAddSubmitting) return;

		setBuildpackAddSubmitting(true);

		const body: { url: string; index?: number } = { url: newBuildpackUrl };
		if (newBuildpackIndex) {
			const idx = parseInt(newBuildpackIndex, 10);
			if (!Number.isNaN(idx) && idx > 0) {
				body.index = idx;
			}
		}

		await streamAction(`/apps/${encodeURIComponent(name)}/buildpacks`, "buildpack:add", {
			method: "POST",
			body: JSON.stringify(body),
			onSuccess: () => {
				setNewBuildpackUrl("");
				setNewBuildpackIndex("");
				void refetchBuildpacks();
			},
		});

		setBuildpackAddSubmitting(false);
	};

	const handleRemoveBuildpack = (buildpack: Buildpack) => {
		setPendingRemoveBuildpack(buildpack);
		setShowRemoveBuildpackDialog(true);
	};

	const confirmRemoveBuildpack = async () => {
		if (!name || !pendingRemoveBuildpack || buildpackRemoveSubmitting) return;

		setBuildpackRemoveSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/buildpacks`, "buildpack:remove", {
			method: "DELETE",
			body: JSON.stringify({ url: pendingRemoveBuildpack.url }),
			onSuccess: () => {
				setShowRemoveBuildpackDialog(false);
				setPendingRemoveBuildpack(null);
				void refetchBuildpacks();
			},
			onError: () => {
				setShowRemoveBuildpackDialog(false);
				setPendingRemoveBuildpack(null);
			},
		});

		setBuildpackRemoveSubmitting(false);
	};

	const confirmClearBuildpacks = async () => {
		if (!name || clearBuildpacksSubmitting) return;

		setClearBuildpacksSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/buildpacks/all`, "buildpacks:clear", {
			method: "DELETE",
			onSuccess: () => {
				setShowClearBuildpacksDialog(false);
				void refetchBuildpacks();
			},
			onError: () => {
				setShowClearBuildpacksDialog(false);
			},
		});

		setClearBuildpacksSubmitting(false);
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

		await streamAction(`/apps/${encodeURIComponent(name)}/deployment`, "deployment:update", {
			method: "PUT",
			body: JSON.stringify(changes),
			onSuccess: () => void refetchDeploymentSettings(),
			onError: () => void refetchDeploymentSettings(),
		});

		setDeploymentSubmitting(false);
	};

	const handleAddDockerOption = async () => {
		if (!name || !newDockerOption || dockerOptionAddSubmitting) return;

		setDockerOptionAddSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/docker-options`, "docker-option:add", {
			method: "POST",
			body: JSON.stringify({ phase: newDockerOptionPhase, option: newDockerOption }),
			onSuccess: () => {
				setNewDockerOption("");
				void refetchDockerOptions();
			},
		});

		setDockerOptionAddSubmitting(false);
	};

	const handleRemoveDockerOption = (phase: "build" | "deploy" | "run", option: string) => {
		setPendingRemoveDockerOption({ phase, option });
		setShowRemoveDockerOptionDialog(true);
	};

	const confirmRemoveDockerOption = async () => {
		if (!name || !pendingRemoveDockerOption || dockerOptionRemoveSubmitting) return;

		setDockerOptionRemoveSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/docker-options`, "docker-option:remove", {
			method: "DELETE",
			body: JSON.stringify({
				phase: pendingRemoveDockerOption.phase,
				option: pendingRemoveDockerOption.option,
			}),
			onSuccess: () => {
				setShowRemoveDockerOptionDialog(false);
				setPendingRemoveDockerOption(null);
				void refetchDockerOptions();
			},
			onError: () => {
				setShowRemoveDockerOptionDialog(false);
				setPendingRemoveDockerOption(null);
			},
		});

		setDockerOptionRemoveSubmitting(false);
	};

	const handleClearDockerPhase = (phase: "build" | "deploy" | "run") => {
		setPendingClearDockerPhase(phase);
		setShowClearDockerPhaseDialog(true);
	};

	const confirmClearDockerPhase = async () => {
		if (!name || !pendingClearDockerPhase || clearDockerPhaseSubmitting) return;

		setClearDockerPhaseSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/docker-options`, "docker-options:clear", {
			method: "DELETE",
			body: JSON.stringify({ phase: pendingClearDockerPhase }),
			onSuccess: () => {
				setShowClearDockerPhaseDialog(false);
				setPendingClearDockerPhase(null);
				void refetchDockerOptions();
			},
			onError: () => {
				setShowClearDockerPhaseDialog(false);
				setPendingClearDockerPhase(null);
			},
		});

		setClearDockerPhaseSubmitting(false);
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

		await streamAction(`/apps/${encodeURIComponent(name)}/network`, "network:set", {
			method: "PUT",
			body: JSON.stringify({ key, value: networkEditValue }),
			onSuccess: () => {
				setEditingNetworkKey(null);
				setNetworkEditValue("");
				void refetchNetwork();
			},
			onError: () => void refetchNetwork(),
		});

		setNetworkSubmitting(false);
	};

	const handleClearNetworkProperty = async (key: string) => {
		if (!name || networkSubmitting) return;

		setNetworkSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/network`, "network:clear", {
			method: "DELETE",
			body: JSON.stringify({ key }),
			onSuccess: () => void refetchNetwork(),
			onError: () => void refetchNetwork(),
		});

		setNetworkSubmitting(false);
	};

	const handleGitSync = async (repo: string, branch: string) => {
		if (!name || gitSyncing) return;

		setGitSyncing(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/git/sync`, "deploy", {
			body: JSON.stringify({ repo, ...(branch && { branch }) }),
			onSuccess: () => {
				void refetch();
				void refetchGitInfo();
			},
		});

		setGitSyncing(false);
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

		await streamAction(`/apps/${encodeURIComponent(name)}/ssl/enable`, "ssl:enable", {
			method: "POST",
			body: JSON.stringify({ email: normalizedEmail }),
			onSuccess: () => void refetchSsl(),
			onError: () => void refetchSsl(),
		});

		setSslSubmitting(false);
	};

	const handleRenewSSL = async () => {
		if (!name || sslSubmitting) return;

		setSslSubmitting(true);

		await streamAction(`/apps/${encodeURIComponent(name)}/ssl/renew`, "ssl:renew", {
			method: "POST",
			onSuccess: () => void refetchSsl(),
			onError: () => void refetchSsl(),
		});

		setSslSubmitting(false);
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
					canModify={canModify}
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

			{/* Unlock Dialog */}
			<ConfirmDialog
				visible={showUnlockDialog}
				title="Unlock App"
				onClose={() => setShowUnlockDialog(false)}
				onConfirm={confirmUnlockApp}
				submitting={unlocking}
				confirmText="Unlock App"
			>
				<p>
					Are you sure you want to unlock <strong>{name}</strong>? This will allow deployments to
					proceed.
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
					<button
						onClick={() => setActiveTab("git")}
						className={`pb-2 px-2 ${activeTab === "git" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
						type="button"
					>
						Git
					</button>
				</nav>
			</div>

			{activeTab === "overview" && (
				<AppOverview
					app={app}
					hostname={hostname}
					copySuccess={copySuccess}
					scaleChanges={scaleChanges}
					canModify={canModify}
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
					configVars={configVars ?? {}}
					loading={configLoading}
					error={configError}
					newKey={newConfigKey}
					newValue={newConfigValue}
					submitting={configAddSubmitting}
					visibleValues={visibleValues}
					canModify={canModify}
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
					canModify={canModify}
					onDomainChange={setNewDomain}
					onAdd={handleAddDomain}
					onRemove={handleRemoveDomain}
				/>
			)}

			{activeTab === "ssl" && (
				<AppSSL
					sslStatus={sslStatus ?? null}
					loading={sslLoading}
					error={sslError}
					email={sslEmail}
					submitting={sslSubmitting}
					canModify={canModify}
					onEmailChange={setSslEmail}
					onEnable={handleEnableSSL}
					onRenew={handleRenewSSL}
				/>
			)}

			{activeTab === "settings" && (
				<div className="space-y-6">
					<AppDeployment
						settings={deploymentSettings ?? null}
						loading={deploymentLoading}
						error={deploymentError}
						deployBranch={deployBranch}
						buildDir={buildDir}
						builder={builder}
						submitting={deploymentSubmitting}
						canModify={canModify}
						onDeployBranchChange={setDeployBranch}
						onBuildDirChange={setBuildDir}
						onBuilderChange={setBuilder}
						onSave={handleSaveDeployment}
					/>

					<AppPorts
						ports={ports}
						proxyReport={proxyReport ?? null}
						loading={portsLoading || proxyLoading}
						error={portsError || proxyError}
						newScheme={newPortScheme}
						newHostPort={newHostPort}
						newContainerPort={newContainerPort}
						submitting={portAddSubmitting}
						proxySubmitting={proxySubmitting}
						canModify={canModify}
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
						canModify={canModify}
						onUrlChange={setNewBuildpackUrl}
						onIndexChange={setNewBuildpackIndex}
						onAdd={handleAddBuildpack}
						onRemove={handleRemoveBuildpack}
						onClearAll={() => setShowClearBuildpacksDialog(true)}
					/>

					<AppDockerOptions
						dockerOptions={dockerOptions ?? null}
						loading={dockerOptionsLoading}
						error={dockerOptionsError}
						newPhase={newDockerOptionPhase}
						newOption={newDockerOption}
						addSubmitting={dockerOptionAddSubmitting}
						clearSubmitting={(phase) =>
							phase === pendingClearDockerPhase ? clearDockerPhaseSubmitting : false
						}
						canModify={canModify}
						onPhaseChange={setNewDockerOptionPhase}
						onOptionChange={setNewDockerOption}
						onAdd={handleAddDockerOption}
						onRemove={handleRemoveDockerOption}
						onClearPhase={handleClearDockerPhase}
					/>

					<AppNetwork
						networkReport={networkReport ?? null}
						loading={networkLoading}
						error={networkError}
						submitting={networkSubmitting}
						editingKey={editingNetworkKey}
						editValue={networkEditValue}
						canModify={canModify}
						onStartEdit={handleStartEditNetwork}
						onCancelEdit={handleCancelEditNetwork}
						onSave={handleSaveNetworkProperty}
						onClear={handleClearNetworkProperty}
						onValueChange={setNetworkEditValue}
					/>
				</div>
			)}

			{activeTab === "git" && (
				<AppGit
					gitInfo={gitInfo ?? null}
					loading={gitLoading}
					error={gitError}
					syncing={gitSyncing}
					canModify={canModify}
					onSync={handleGitSync}
					onUnlock={handleUnlockApp}
				/>
			)}
		</div>
	);
}
