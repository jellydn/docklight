import cookieParser from "cookie-parser";
import express from "express";
import http from "http";
import path from "path";
import pinoHttp from "pino-http";
import {
	getAppDetail,
	getApps,
	rebuildApp,
	restartApp,
	scaleApp,
	createApp,
	destroyApp,
	stopApp,
	startApp,
} from "./lib/apps.js";
import {
	authMiddleware,
	clearAuthCookie,
	hashPassword,
	login,
	loginWithCredentials,
	setAuthCookie,
	requireAdmin,
	requireOperator,
} from "./lib/auth.js";
import { clearPrefix, get, set } from "./lib/cache.js";
import { getConfig, setConfig, unsetConfig } from "./lib/config.js";
import {
	createDatabase,
	destroyDatabase,
	getDatabases,
	linkDatabase,
	unlinkDatabase,
} from "./lib/databases.js";
import { getAuditLogs, getRecentCommands, getAllUsers, createUser, getUserById, updateUser, deleteUser, getUserCount } from "./lib/db.js";
import { addDomain, getDomains, removeDomain } from "./lib/domains.js";
import { logger } from "./lib/logger.js";
import {
	addPort,
	clearPorts,
	disableProxy,
	enableProxy,
	getPorts,
	getProxyReport,
	removePort,
} from "./lib/ports.js";
import { addBuildpack, clearBuildpacks, getBuildpacks, removeBuildpack } from "./lib/buildpacks.js";
import {
	addDockerOption,
	clearDockerOptions,
	getDockerOptions,
	removeDockerOption,
} from "./lib/docker-options.js";
import { getNetworkReport, setNetworkProperty, clearNetworkProperty } from "./lib/network.js";
import {
	getDeploymentSettings,
	setDeployBranch,
	setBuildDir,
	clearBuildDir,
	setBuilder,
} from "./lib/deployment.js";
import {
	disablePlugin,
	enablePlugin,
	getPlugins,
	installPlugin,
	uninstallPlugin,
} from "./lib/plugins.js";
import { getServerHealth } from "./lib/server.js";
import { enableSSL, getSSL, renewSSL } from "./lib/ssl.js";
import { authRateLimiter } from "./lib/rate-limiter.js";
import { setupLogStreaming } from "./lib/websocket.js";
import type { CommandResult } from "./lib/executor.js";

const app = express();

type CommandResultLike =
	| CommandResult
	| { error: string; exitCode: number; command?: string; stdout?: string; stderr?: string };

function handleCommandResult(res: express.Response, result: CommandResultLike): boolean {
	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return false;
	}
	return true;
}
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");

app.use(cookieParser());
app.use(express.json());
app.set("trust proxy", true);
app.use(pinoHttp({ logger }));

// Serve static files from client
app.use(express.static(CLIENT_DIST));

app.get("/api/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.post("/api/auth/login", authRateLimiter, async (req, res) => {
	const { username, password } = req.body;

	if (username) {
		// Multi-user mode: validate against users table
		const user = await loginWithCredentials(username, password);
		if (user) {
			setAuthCookie(res, user);
			res.json({ success: true });
		} else {
			res.status(401).json({ error: "Invalid credentials" });
		}
	} else {
		// Legacy mode: validate against DOCKLIGHT_PASSWORD env var
		if (login(password)) {
			setAuthCookie(res);
			res.json({ success: true });
		} else {
			res.status(401).json({ error: "Invalid password" });
		}
	}
});

app.post("/api/auth/logout", (_req, res) => {
	clearAuthCookie(res);
	res.json({ success: true });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
	const user = req.user;
	res.json({
		authenticated: true,
		user:
			user?.userId !== undefined
				? { id: user.userId, username: user.username, role: user.role }
				: undefined,
	});
});

// Bootstrap: expose whether multi-user mode is active (no auth required)
app.get("/api/auth/mode", (_req, res) => {
	res.json({ multiUser: getUserCount() > 0 });
});

app.use("/api", authMiddleware);

app.get("/api/users", requireAdmin, (_req, res) => {
	const users = getAllUsers();
	res.json(users);
});

app.post("/api/users", requireAdmin, async (req, res) => {
	const { username, password, role } = req.body;

	if (!username || typeof username !== "string") {
		res.status(400).json({ error: "Username is required" });
		return;
	}
	if (!password || typeof password !== "string") {
		res.status(400).json({ error: "Password is required" });
		return;
	}
	if (!role || !["admin", "operator", "viewer"].includes(role)) {
		res.status(400).json({ error: "Role must be 'admin', 'operator', or 'viewer'" });
		return;
	}

	try {
		const passwordHash = await hashPassword(password);
		const user = createUser(username, passwordHash, role);
		res.status(201).json(user);
	} catch (_err) {
		res.status(409).json({ error: "Username already exists" });
	}
});

app.put("/api/users/:id", requireAdmin, async (req, res) => {
	const id = parseInt(req.params.id as string);
	const { role, password } = req.body;

	if (Number.isNaN(id)) {
		res.status(400).json({ error: "Invalid user ID" });
		return;
	}

	const existing = getUserById(id);
	if (!existing) {
		res.status(404).json({ error: "User not found" });
		return;
	}

	const updates: { role?: "admin" | "operator" | "viewer"; passwordHash?: string } = {};

	if (role !== undefined) {
		if (!["admin", "operator", "viewer"].includes(role)) {
			res.status(400).json({ error: "Role must be 'admin', 'operator', or 'viewer'" });
			return;
		}
		updates.role = role;
	}

	if (password !== undefined) {
		if (typeof password !== "string" || password.length === 0) {
			res.status(400).json({ error: "Password must be a non-empty string" });
			return;
		}
		updates.passwordHash = await hashPassword(password);
	}

	updateUser(id, updates);
	res.json(getUserById(id));
});

app.delete("/api/users/:id", requireAdmin, (req, res) => {
	const id = parseInt(req.params.id as string);

	if (Number.isNaN(id)) {
		res.status(400).json({ error: "Invalid user ID" });
		return;
	}

	const existing = getUserById(id);
	if (!existing) {
		res.status(404).json({ error: "User not found" });
		return;
	}

	// Prevent deleting the last admin
	if (existing.role === "admin") {
		const users = getAllUsers();
		const adminCount = users.filter((u) => u.role === "admin").length;
		if (adminCount <= 1) {
			res.status(400).json({ error: "Cannot delete the last admin user" });
			return;
		}
	}

	deleteUser(id);
	res.json({ success: true });
});

app.get("/api/commands", (req, res) => {
	const limit = parseInt(req.query.limit as string) || 20;
	const commands = getRecentCommands(limit);
	res.json(commands);
});

app.get("/api/audit/logs", (req, res) => {
	const limit = parseInt(req.query.limit as string) || 50;
	const offset = parseInt(req.query.offset as string) || 0;
	const startDate = req.query.startDate as string | undefined;
	const endDate = req.query.endDate as string | undefined;
	const command = req.query.command as string | undefined;
	const exitCode = (req.query.exitCode as string) || "all";

	// Validate exitCode filter
	if (exitCode !== "all" && exitCode !== "success" && exitCode !== "error") {
		res
			.status(400)
			.json({ error: "Invalid exitCode filter. Must be 'all', 'success', or 'error'" });
		return;
	}

	const result = getAuditLogs({
		limit,
		offset,
		startDate,
		endDate,
		command,
		exitCode: exitCode as "all" | "success" | "error",
	});

	res.json(result);
});

app.get("/api/apps", async (_req, res) => {
	const cacheKey = "apps:list";
	const cached = get(cacheKey);

	if (cached) {
		res.json(cached);
		return;
	}

	const apps = await getApps();
	if (!Array.isArray(apps)) {
		logger.error({ apps }, "Failed to fetch apps");
		res.status(apps.exitCode >= 400 ? apps.exitCode : 500).json(apps);
		return;
	}

	set(cacheKey, apps);
	res.json(apps);
});

app.post("/api/apps", async (req, res) => {
	const { name } = req.body;
	if (!name || typeof name !== "string") {
		res.status(400).json({ error: "App name is required" });
		return;
	}

	const result = await createApp(name);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.status(201).json({ success: true, name });
});

app.get("/api/apps/:name", async (req, res) => {
	const { name } = req.params;
	const app = await getAppDetail(name);
	res.json(app);
});

app.post("/api/apps/:name/restart", async (req, res) => {
	const { name } = req.params;
	const result = await restartApp(name);
	clearPrefix("apps:");
	res.json(result);
});

app.post("/api/apps/:name/rebuild", async (req, res) => {
	const { name } = req.params;
	const result = await rebuildApp(name);
	clearPrefix("apps:");
	res.json(result);
});

app.post("/api/apps/:name/stop", async (req, res) => {
	const { name } = req.params;
	const result = await stopApp(name);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.post("/api/apps/:name/start", async (req, res) => {
	const { name } = req.params;
	const result = await startApp(name);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.post("/api/apps/:name/scale", async (req, res) => {
	const { name } = req.params;
	const { processType, count } = req.body;
	const result = await scaleApp(name, processType, count);
	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name", async (req, res) => {
	const { name } = req.params;
	const { confirmName } = req.body;
	if (!confirmName || typeof confirmName !== "string") {
		res.status(400).json({ error: "App name confirmation is required" });
		return;
	}
	const result = await destroyApp(name, confirmName);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/server/health", async (_req, res) => {
	const health = await getServerHealth();
	res.json(health);
});

app.get("/api/apps/:name/config", requireAdmin, async (req, res) => {
	const name = req.params.name as string;
	const config = await getConfig(name);
	res.json(config);
});

app.post("/api/apps/:name/config", requireAdmin, async (req, res) => {
	const name = req.params.name as string;
	const { key, value } = req.body;
	const result = await setConfig(name, key, value);
	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/config/:key", requireAdmin, async (req, res) => {
	const name = req.params.name as string;
	const key = req.params.key as string;
	const result = await unsetConfig(name, key);
	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/domains", async (req, res) => {
	const { name } = req.params;
	const domains = await getDomains(name);
	res.json(domains);
});

app.post("/api/apps/:name/domains", async (req, res) => {
	const { name } = req.params;
	const { domain } = req.body;
	const result = await addDomain(name, domain);
	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/domains/:domain", async (req, res) => {
	const { name, domain } = req.params;
	const result = await removeDomain(name, domain);
	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/ports", async (req, res) => {
	const { name } = req.params;
	const ports = await getPorts(name);
	if (!Array.isArray(ports)) {
		const statusCode = ports.exitCode >= 400 && ports.exitCode < 600 ? ports.exitCode : 500;
		res.status(statusCode).json(ports);
		return;
	}
	res.json({ ports });
});

app.post("/api/apps/:name/ports", async (req, res) => {
	const { name } = req.params;
	const { scheme, hostPort, containerPort } = req.body;

	const result = await addPort(name, scheme, hostPort, containerPort);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/ports", async (req, res) => {
	const { name } = req.params;
	const { scheme, hostPort, containerPort } = req.body;

	const result = await removePort(name, scheme, hostPort, containerPort);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/ports/all", async (req, res) => {
	const { name } = req.params;
	const result = await clearPorts(name);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/proxy", async (req, res) => {
	const { name } = req.params;
	const proxyReport = await getProxyReport(name);
	if ("error" in proxyReport) {
		const statusCode =
			proxyReport.exitCode >= 400 && proxyReport.exitCode < 600 ? proxyReport.exitCode : 500;
		res.status(statusCode).json(proxyReport);
		return;
	}

	res.json(proxyReport);
});

app.post("/api/apps/:name/proxy/enable", async (req, res) => {
	const { name } = req.params;
	const result = await enableProxy(name);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.post("/api/apps/:name/proxy/disable", async (req, res) => {
	const { name } = req.params;
	const result = await disableProxy(name);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/buildpacks", async (req, res) => {
	const { name } = req.params;
	const buildpacks = await getBuildpacks(name);
	if (!Array.isArray(buildpacks)) {
		const statusCode =
			buildpacks.exitCode >= 400 && buildpacks.exitCode < 600 ? buildpacks.exitCode : 500;
		res.status(statusCode).json(buildpacks);
		return;
	}

	res.json({ buildpacks });
});

app.post("/api/apps/:name/buildpacks", async (req, res) => {
	const { name } = req.params;
	const { url, index } = req.body;

	const result = await addBuildpack(name, url, index);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/buildpacks", async (req, res) => {
	const { name } = req.params;
	const { url } = req.body;

	const result = await removeBuildpack(name, url);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/buildpacks/all", async (req, res) => {
	const { name } = req.params;
	const result = await clearBuildpacks(name);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/docker-options", async (req, res) => {
	const { name } = req.params;
	const dockerOptions = await getDockerOptions(name);
	if ("error" in dockerOptions) {
		const statusCode =
			dockerOptions.exitCode >= 400 && dockerOptions.exitCode < 600 ? dockerOptions.exitCode : 500;
		res.status(statusCode).json(dockerOptions);
		return;
	}

	res.json(dockerOptions);
});

app.post("/api/apps/:name/docker-options", async (req, res) => {
	const { name } = req.params;
	const { phase, option } = req.body;

	const result = await addDockerOption(name, phase, option);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/docker-options", async (req, res) => {
	const { name } = req.params;
	const { phase, option } = req.body;

	const result = await removeDockerOption(name, phase, option);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/docker-options/all", async (req, res) => {
	const { name } = req.params;
	const { phase } = req.body;

	const result = await clearDockerOptions(name, phase);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/network", async (req, res) => {
	const { name } = req.params;
	const networkReport = await getNetworkReport(name);
	if ("error" in networkReport) {
		const statusCode =
			networkReport.exitCode >= 400 && networkReport.exitCode < 600 ? networkReport.exitCode : 500;
		res.status(statusCode).json(networkReport);
		return;
	}

	res.json(networkReport);
});

app.put("/api/apps/:name/network", async (req, res) => {
	const { name } = req.params;
	const { key, value } = req.body;

	const result = await setNetworkProperty(name, key, value ?? "");
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/network", async (req, res) => {
	const { name } = req.params;
	const { key } = req.body;

	const result = await clearNetworkProperty(name, key);
	if (!handleCommandResult(res, result)) return;

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/deployment", async (req, res) => {
	const { name } = req.params;
	const deploymentSettings = await getDeploymentSettings(name);
	if ("error" in deploymentSettings) {
		const statusCode =
			deploymentSettings.exitCode >= 400 && deploymentSettings.exitCode < 600
				? deploymentSettings.exitCode
				: 500;
		res.status(statusCode).json(deploymentSettings);
		return;
	}

	res.json(deploymentSettings);
});

app.put("/api/apps/:name/deployment", async (req, res) => {
	const { name } = req.params;
	const { deployBranch, buildDir, builder } = req.body;
	const promises: Promise<CommandResultLike>[] = [];

	if (deployBranch !== undefined) {
		promises.push(setDeployBranch(name, deployBranch));
	}
	if (buildDir !== undefined) {
		promises.push(
			buildDir === "" || buildDir === null ? clearBuildDir(name) : setBuildDir(name, buildDir)
		);
	}
	if (builder !== undefined) {
		promises.push(setBuilder(name, builder ?? ""));
	}

	if (promises.length === 0) {
		res
			.status(400)
			.json({ error: "At least one of deployBranch, buildDir, or builder is required" });
		return;
	}

	const results = await Promise.all(promises);
	const firstError = results.find((r) => r.exitCode !== 0);

	if (firstError) {
		const statusCode =
			firstError.exitCode >= 400 && firstError.exitCode < 600 ? firstError.exitCode : 500;
		res.status(statusCode).json(firstError);
		return;
	}

	clearPrefix("apps:");
	res.json(results[results.length - 1]);
});

app.get("/api/databases", async (_req, res) => {
	const cacheKey = "databases:list";
	const cached = get(cacheKey);

	if (cached) {
		res.json(cached);
		return;
	}

	const databases = await getDatabases();
	if (!Array.isArray(databases)) {
		logger.error({ databases }, "Failed to fetch databases");
		res.status(databases.exitCode >= 400 ? databases.exitCode : 500).json(databases);
		return;
	}

	set(cacheKey, databases);
	res.json(databases);
});

app.post("/api/databases", async (req, res) => {
	const { plugin, name } = req.body;
	const result = await createDatabase(plugin, name);
	clearPrefix("databases:");
	res.json(result);
});

app.post("/api/databases/:name/link", async (req, res) => {
	const { name } = req.params;
	const { plugin, app } = req.body;
	const result = await linkDatabase(plugin, name, app);
	clearPrefix("databases:");
	res.json(result);
});

app.post("/api/databases/:name/unlink", async (req, res) => {
	const { name } = req.params;
	const { plugin, app } = req.body;
	const result = await unlinkDatabase(plugin, name, app);
	clearPrefix("databases:");
	res.json(result);
});

app.delete("/api/databases/:name", async (req, res) => {
	const { name } = req.params;
	const { plugin, confirmName } = req.body;
	const result = await destroyDatabase(plugin, name, confirmName);
	clearPrefix("databases:");
	res.json(result);
});

app.post("/api/plugins/install", async (req, res) => {
	const { repository, name, sudoPassword } = req.body ?? {};
	const result =
		typeof sudoPassword === "string" && sudoPassword.trim().length > 0
			? await installPlugin(repository, name, sudoPassword)
			: await installPlugin(repository, name);
	res.json(result);
});

app.get("/api/plugins", async (_req, res) => {
	const plugins = await getPlugins();
	res.json(plugins);
});

app.post("/api/plugins/:name/enable", async (req, res) => {
	const { name } = req.params;
	const { sudoPassword } = req.body ?? {};
	const result =
		typeof sudoPassword === "string" && sudoPassword.trim().length > 0
			? await enablePlugin(name, sudoPassword)
			: await enablePlugin(name);
	res.json(result);
});

app.post("/api/plugins/:name/disable", async (req, res) => {
	const { name } = req.params;
	const { sudoPassword } = req.body ?? {};
	const result =
		typeof sudoPassword === "string" && sudoPassword.trim().length > 0
			? await disablePlugin(name, sudoPassword)
			: await disablePlugin(name);
	res.json(result);
});

app.delete("/api/plugins/:name", async (req, res) => {
	const { name } = req.params;
	const { sudoPassword } = req.body ?? {};
	const result =
		typeof sudoPassword === "string" && sudoPassword.trim().length > 0
			? await uninstallPlugin(name, sudoPassword)
			: await uninstallPlugin(name);
	res.json(result);
});

app.get("/api/apps/:name/ssl", async (req, res) => {
	const { name } = req.params;
	const ssl = await getSSL(name);
	res.json(ssl);
});

app.post("/api/apps/:name/ssl/enable", async (req, res) => {
	const { name } = req.params;
	const { email } = req.body ?? {};
	const result =
		typeof email === "string" && email.trim().length > 0
			? await enableSSL(name, email)
			: await enableSSL(name);
	res.json(result);
});

app.post("/api/apps/:name/ssl/renew", async (req, res) => {
	const { name } = req.params;
	const result = await renewSSL(name);
	res.json(result);
});

// SPA fallback for client-side routing (must be after all API routes)
app.get("/{*path}", (_req, res) => {
	res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

// Create server and setup WebSocket
const server = http.createServer(app);
setupLogStreaming(server);

server.listen(PORT, () => {
	logger.info(`Docklight server running on port ${PORT}`);
});
