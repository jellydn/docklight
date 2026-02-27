import cookieParser from "cookie-parser";
import express from "express";
import http from "http";
import path from "path";
import pinoHttp from "pino-http";
import { getAppDetail, getApps, rebuildApp, restartApp, scaleApp } from "./lib/apps.js";
import { authMiddleware, clearAuthCookie, login, setAuthCookie } from "./lib/auth.js";
import { getConfig, setConfig, unsetConfig } from "./lib/config.js";
import {
	createDatabase,
	destroyDatabase,
	getDatabases,
	linkDatabase,
	unlinkDatabase,
} from "./lib/databases.js";
import { getRecentCommands } from "./lib/db.js";
import { addDomain, getDomains, removeDomain } from "./lib/domains.js";
import { logger } from "./lib/logger.js";
import { getServerHealth } from "./lib/server.js";
import { enableSSL, getSSL, renewSSL } from "./lib/ssl.js";
import { setupLogStreaming } from "./lib/websocket.js";

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");

app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Serve static files from client
app.use(express.static(CLIENT_DIST));

app.get("/api/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.post("/api/auth/login", (req, res) => {
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

app.get("/api/apps", async (_req, res) => {
	const apps = await getApps();
	if (!Array.isArray(apps)) {
		res.status(apps.exitCode >= 400 ? apps.exitCode : 500).json(apps);
		return;
	}

	res.json(apps);
});

app.get("/api/apps/:name", async (req, res) => {
	const { name } = req.params;
	const app = await getAppDetail(name);
	res.json(app);
});

app.post("/api/apps/:name/restart", async (req, res) => {
	const { name } = req.params;
	const result = await restartApp(name);
	res.json(result);
});

app.post("/api/apps/:name/rebuild", async (req, res) => {
	const { name } = req.params;
	const result = await rebuildApp(name);
	res.json(result);
});

app.post("/api/apps/:name/scale", async (req, res) => {
	const { name } = req.params;
	const { processType, count } = req.body;
	const result = await scaleApp(name, processType, count);
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
	res.json(result);
});

app.delete("/api/apps/:name/config/:key", async (req, res) => {
	const { name, key } = req.params;
	const result = await unsetConfig(name, key);
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
	res.json(result);
});

app.delete("/api/apps/:name/domains/:domain", async (req, res) => {
	const { name, domain } = req.params;
	const result = await removeDomain(name, domain);
	res.json(result);
});

app.get("/api/databases", async (_req, res) => {
	const databases = await getDatabases();
	res.json(databases);
});

app.post("/api/databases", async (req, res) => {
	const { plugin, name } = req.body;
	const result = await createDatabase(plugin, name);
	res.json(result);
});

app.post("/api/databases/:name/link", async (req, res) => {
	const { name } = req.params;
	const { plugin, app } = req.body;
	const result = await linkDatabase(plugin, name, app);
	res.json(result);
});

app.post("/api/databases/:name/unlink", async (req, res) => {
	const { name } = req.params;
	const { plugin, app } = req.body;
	const result = await unlinkDatabase(plugin, name, app);
	res.json(result);
});

app.delete("/api/databases/:name", async (req, res) => {
	const { name } = req.params;
	const { plugin, confirmName } = req.body;
	const result = await destroyDatabase(plugin, name, confirmName);
	res.json(result);
});

app.get("/api/apps/:name/ssl", async (req, res) => {
	const { name } = req.params;
	const ssl = await getSSL(name);
	res.json(ssl);
});

app.post("/api/apps/:name/ssl/enable", async (req, res) => {
	const { name } = req.params;
	const result = await enableSSL(name);
	res.json(result);
});

app.post("/api/apps/:name/ssl/renew", async (req, res) => {
	const { name } = req.params;
	const result = await renewSSL(name);
	res.json(result);
});

// SPA fallback for client-side routing (must be after all API routes)
app.get("*", (_req, res) => {
	res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

// Create server and setup WebSocket
const server = http.createServer(app);
setupLogStreaming(server);

server.listen(PORT, () => {
	logger.info(`Docklight server running on port ${PORT}`);
});
