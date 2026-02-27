import express from "express";
import { isCommandAllowed } from "./lib/allowlist.js";
import { executeCommand } from "./lib/executor.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/api/health", (req, res) => {
	res.json({ status: "ok" });
});

app.listen(PORT, () => {
	console.log(`Docklight server running on port ${PORT}`);
});
