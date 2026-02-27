import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { isCommandAllowed } from "./lib/allowlist.js";
import { getApps, getAppDetail, restartApp, rebuildApp, scaleApp } from "./lib/apps.js";
import { authMiddleware, clearAuthCookie, login, setAuthCookie } from "./lib/auth.js";
import { getRecentCommands } from "./lib/db.js";
import { executeCommand } from "./lib/executor.js";
import { getServerHealth } from "./lib/server.js";
import { getConfig, setConfig, unsetConfig } from "./lib/config.js";
import { getDomains, addDomain, removeDomain } from "./lib/domains.js";
import {
	getDatabases,
	createDatabase,
	linkDatabase,
	unlinkDatabase,
	destroyDatabase,
} from "./lib/databases.js";
import { getSSL, enableSSL, renewSSL } from "./lib/ssl.js";
import { setupLogStreaming } from "./lib/websocket.js";

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_DIST = path.join(process.cwd(), "..", "client", "dist");

app.use(cookieParser());
app.use(express.json());

// Serve static files from client
app.use(express.static(CLIENT_DIST));

// SPA fallback for client-side routing
app.get("*", (req, res) => {
	res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

app.get("/api/health", (req, res) => {
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

app.post("/api/auth/logout", (req, res) => {
	clearAuthCookie(res);
	res.json({ success: true });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
	res.json({ authenticated: true });
});

app.use("/api", authMiddleware);

app.get("/api/commands", (req, res) => {
	const limit = parseInt(req.query.limit as string) || 20;
	const commands = getRecentCommands(limit);
	res.json(commands);
});

app.get("/api/apps", async (req, res) => {
	const apps = await getApps();
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

app.get("/api/server/health", async (req, res) => {
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

app.get("/api/databases", async (req, res) => {
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
	const { app } = req.body;
	const result = await linkDatabase(name, app);
	res.json(result);
});

app.post("/api/databases/:name/unlink", async (req, res) => {
	const { name } = req.params;
	const { app } = req.body;
	const result = await unlinkDatabase(name, app);
	res.json(result);
});

app.delete("/api/databases/:name", async (req, res) => {
	const { name } = req.params;
	const { confirmName } = req.body;
	const result = await destroyDatabase(name, confirmName);
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

// Create server and setup WebSocket
const server = require("http").createServer(app);
setupLogStreaming(server);

server.listen(PORT, () => {
	console.log(`Docklight server running on port ${PORT}`);
});
