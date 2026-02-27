import express from "express";
import { isCommandAllowed } from "./lib/allowlist.js";
import { getRecentCommands } from "./lib/db.js";
import { executeCommand } from "./lib/executor.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/api/health", (req, res) => {
	res.json({ status: "ok" });
});

app.get("/api/commands", (req, res) => {
	const limit = parseInt(req.query.limit as string) || 20;
	const commands = getRecentCommands(limit);
	res.json(commands);
});

app.listen(PORT, () => {
	console.log(`Docklight server running on port ${PORT}`);
});
