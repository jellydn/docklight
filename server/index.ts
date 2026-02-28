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
import { authMiddleware, clearAuthCookie, login, setAuthCookie } from "./lib/auth.js";
import { clearPrefix, get, set } from "./lib/cache.js";
import { getConfig, setConfig, unsetConfig } from "./lib/config.js";
import {
	createDatabase,
	destroyDatabase,
	getDatabases,
	linkDatabase,
	unlinkDatabase,
} from "./lib/databases.js";
import { getAuditLogs, getRecentCommands } from "./lib/db.js";
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

const app = express();
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

app.post("/api/auth/login", authRateLimiter, (req, res) => {
	const { password } = req.body;

	if (login(password)) {
		setAuthCookie(res);
		res.json({ success: true });
	} else {
		res.status(401).json({ error: "Invalid password" });
	}
});

app.post("/api/auth/logout", (_req, res) => {
	clearAuthCookie(res);
	res.json({ success: true });
});

app.get("/api/auth/me", authMiddleware, (_req, res) => {
	res.json({ authenticated: true });
});

app.use("/api", authMiddleware);

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

app.get("/api/apps/:name/config", async (req, res) => {
	const { name } = req.params;
	const config = await getConfig(name);
	res.json(config);
});

app.post("/api/apps/:name/config", async (req, res) => {
	const { name } = req.params;
	const { key, value } = req.body;
	const result = await setConfig(name, key, value);
	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/config/:key", async (req, res) => {
	const { name, key } = req.params;
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
	res.json(ports);
});

app.post("/api/apps/:name/ports", async (req, res) => {
	const { name } = req.params;
	const { scheme, hostPort, containerPort } = req.body;

	if (!scheme || typeof scheme !== "string") {
		res.status(400).json({ error: "Scheme is required" });
		return;
	}

	if (typeof hostPort !== "number" || typeof containerPort !== "number") {
		res.status(400).json({ error: "Host port and container port are required" });
		return;
	}

	const result = await addPort(name, scheme, hostPort, containerPort);
	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/ports", async (req, res) => {
	const { name } = req.params;
	const { scheme, hostPort, containerPort } = req.body;

	if (!scheme || typeof scheme !== "string") {
		res.status(400).json({ error: "Scheme is required" });
		return;
	}

	if (typeof hostPort !== "number" || typeof containerPort !== "number") {
		res.status(400).json({ error: "Host port and container port are required" });
		return;
	}

	const result = await removePort(name, scheme, hostPort, containerPort);
	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/ports/all", async (req, res) => {
	const { name } = req.params;
	const result = await clearPorts(name);
	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/proxy", async (req, res) => {
	const { name } = req.params;
	const proxyReport = await getProxyReport(name);
	res.json(proxyReport);
});

app.post("/api/apps/:name/proxy/enable", async (req, res) => {
	const { name } = req.params;
	const result = await enableProxy(name);
	clearPrefix("apps:");
	res.json(result);
});

app.post("/api/apps/:name/proxy/disable", async (req, res) => {
	const { name } = req.params;
	const result = await disableProxy(name);
	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/buildpacks", async (req, res) => {
	const { name } = req.params;
	const buildpacks = await getBuildpacks(name);
	res.json(buildpacks);
});

app.post("/api/apps/:name/buildpacks", async (req, res) => {
	const { name } = req.params;
	const { url, index } = req.body;

	if (!url || typeof url !== "string") {
		res.status(400).json({ error: "Buildpack URL is required" });
		return;
	}

	const result = await addBuildpack(name, url, index);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/buildpacks", async (req, res) => {
	const { name } = req.params;
	const { url } = req.body;

	if (!url || typeof url !== "string") {
		res.status(400).json({ error: "Buildpack URL is required" });
		return;
	}

	const result = await removeBuildpack(name, url);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/buildpacks/all", async (req, res) => {
	const { name } = req.params;
	const result = await clearBuildpacks(name);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/docker-options", async (req, res) => {
	const { name } = req.params;
	const dockerOptions = await getDockerOptions(name);
	res.json(dockerOptions);
});

app.post("/api/apps/:name/docker-options", async (req, res) => {
	const { name } = req.params;
	const { phase, option } = req.body;

	if (!phase || typeof phase !== "string") {
		res.status(400).json({ error: "Phase is required (build, deploy, or run)" });
		return;
	}

	if (!option || typeof option !== "string") {
		res.status(400).json({ error: "Docker option is required" });
		return;
	}

	const result = await addDockerOption(name, phase, option);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/docker-options", async (req, res) => {
	const { name } = req.params;
	const { phase, option } = req.body;

	if (!phase || typeof phase !== "string") {
		res.status(400).json({ error: "Phase is required (build, deploy, or run)" });
		return;
	}

	if (!option || typeof option !== "string") {
		res.status(400).json({ error: "Docker option is required" });
		return;
	}

	const result = await removeDockerOption(name, phase, option);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/docker-options/all", async (req, res) => {
	const { name } = req.params;
	const { phase } = req.body;

	if (!phase || typeof phase !== "string") {
		res.status(400).json({ error: "Phase is required (build, deploy, or run)" });
		return;
	}

	const result = await clearDockerOptions(name, phase);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/network", async (req, res) => {
	const { name } = req.params;
	const networkReport = await getNetworkReport(name);
	res.json(networkReport);
});

app.put("/api/apps/:name/network", async (req, res) => {
	const { name } = req.params;
	const { key, value } = req.body;

	if (!key || typeof key !== "string") {
		res.status(400).json({ error: "Network property key is required" });
		return;
	}

	const result = await setNetworkProperty(name, key, value ?? "");

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.delete("/api/apps/:name/network", async (req, res) => {
	const { name } = req.params;
	const { key } = req.body;

	if (!key || typeof key !== "string") {
		res.status(400).json({ error: "Network property key is required" });
		return;
	}

	const result = await clearNetworkProperty(name, key);

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
});

app.get("/api/apps/:name/deployment", async (req, res) => {
	const { name } = req.params;
	const deploymentSettings = await getDeploymentSettings(name);
	res.json(deploymentSettings);
});

app.put("/api/apps/:name/deployment", async (req, res) => {
	const { name } = req.params;
	const { deployBranch, buildDir, builder } = req.body;

	let result: Awaited<ReturnType<typeof setDeployBranch>>;

	if (deployBranch !== undefined) {
		result = await setDeployBranch(name, deployBranch);
	} else if (buildDir !== undefined) {
		result =
			buildDir === "" || buildDir === null
				? await clearBuildDir(name)
				: await setBuildDir(name, buildDir);
	} else if (builder !== undefined) {
		result = await setBuilder(name, builder ?? "");
	} else {
		res
			.status(400)
			.json({ error: "At least one of deployBranch, buildDir, or builder is required" });
		return;
	}

	if (result.exitCode !== 0) {
		const statusCode = result.exitCode >= 400 && result.exitCode < 600 ? result.exitCode : 500;
		res.status(statusCode).json(result);
		return;
	}

	clearPrefix("apps:");
	res.json(result);
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
