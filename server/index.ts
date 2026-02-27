import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { isCommandAllowed } from "./lib/allowlist.js";
import { getApps } from "./lib/apps.js";
import {
	authMiddleware,
	clearAuthCookie,
	login,
	setAuthCookie,
} from "./lib/auth.js";
import { getRecentCommands } from "./lib/db.js";
import { executeCommand } from "./lib/executor.js";

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

app.listen(PORT, () => {
	console.log(`Docklight server running on port ${PORT}`);
});
