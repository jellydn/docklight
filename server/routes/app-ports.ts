import type express from "express";
import { addPort, clearPorts, getPorts, removePort } from "../lib/ports.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware } from "../lib/auth.js";
import { getParam, handleCommandResult } from "./util.js";

export function registerAppPortRoutes(app: express.Application): void {
	app.get("/api/apps/:name/ports", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const ports = await getPorts(name);
		if (!Array.isArray(ports)) {
			const statusCode = ports.exitCode >= 400 && ports.exitCode < 600 ? ports.exitCode : 500;
			res.status(statusCode).json(ports);
			return;
		}
		res.json({ ports });
	});

	app.post("/api/apps/:name/ports", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { scheme, hostPort, containerPort } = req.body;

		const result = await addPort(name, scheme, hostPort, containerPort);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/ports", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { scheme, hostPort, containerPort } = req.body;

		const result = await removePort(name, scheme, hostPort, containerPort);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/ports/all", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await clearPorts(name);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});
}
