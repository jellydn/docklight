import cookieParser from "cookie-parser";
import express from "express";
import { isCommandAllowed } from "./lib/allowlist.js";
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

app.use(cookieParser());
app.use(express.json());

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

app.listen(PORT, () => {
	console.log(`Docklight server running on port ${PORT}`);
});
