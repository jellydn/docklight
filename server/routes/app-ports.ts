import type express from "express";
import {
	addPort,
	clearPorts,
	getPorts,
	removePort,
	validatePort,
	validateScheme,
} from "../lib/ports.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, handleCommandResult, getStatusCode } from "./util.js";
import { streamAction } from "./stream-util.js";

export function registerAppPortRoutes(app: express.Application): void {
	app.get("/api/apps/:name/ports", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const cacheKey = `apps:${name}:ports`;
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const ports = await getPorts(name);
		if (!Array.isArray(ports)) {
			res.status(getStatusCode(ports.exitCode)).json(ports);
			return;
		}
		set(cacheKey, { ports });
		res.json({ ports });
	});

	app.post("/api/apps/:name/ports", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { scheme, hostPort, containerPort } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}

			const schemeValue = scheme || "http";
			const schemeError = validateScheme(schemeValue);
			if (schemeError) {
				res.status(400).json({ error: schemeError });
				return;
			}

			const hostPortError = validatePort(hostPort);
			if (hostPortError) {
				res.status(400).json({ error: hostPortError });
				return;
			}

			const containerPortValue = containerPort || hostPort;
			const containerPortError = validatePort(containerPortValue);
			if (containerPortError) {
				res.status(400).json({ error: `Container ${containerPortError}` });
				return;
			}

			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.portsAdd(name, schemeValue, hostPort, containerPortValue),
				auditAction: "port:add",
				appName: name,
				auditDetails: { scheme: schemeValue, hostPort, containerPort: containerPortValue },
			});
			return;
		}

		const result = await addPort(name, scheme, hostPort, containerPort);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/ports", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { scheme, hostPort, containerPort } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}

			const schemeValue = scheme || "http";
			const schemeError = validateScheme(schemeValue);
			if (schemeError) {
				res.status(400).json({ error: schemeError });
				return;
			}

			const hostPortError = validatePort(hostPort);
			if (hostPortError) {
				res.status(400).json({ error: hostPortError });
				return;
			}

			const containerPortValue = containerPort || hostPort;
			const containerPortError = validatePort(containerPortValue);
			if (containerPortError) {
				res.status(400).json({ error: `Container ${containerPortError}` });
				return;
			}

			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.portsRemove(name, schemeValue, hostPort, containerPortValue),
				auditAction: "port:remove",
				appName: name,
				auditDetails: { scheme: schemeValue, hostPort, containerPort: containerPortValue },
			});
			return;
		}

		const result = await removePort(name, scheme, hostPort, containerPort);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete("/api/apps/:name/ports/all", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");

		if (isSSERequest(req)) {
			if (!isValidAppName(name)) {
				res.status(400).json({ error: "Invalid app name" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.portsClear(name),
				auditAction: "port:clear",
				appName: name,
			});
			return;
		}

		const result = await clearPorts(name);
		if (!handleCommandResult(res, result)) return;

		clearPrefix("apps:");
		res.json(result);
	});
}
