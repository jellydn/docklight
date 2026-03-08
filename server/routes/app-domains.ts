import type express from "express";
import { addDomain, getDomains, removeDomain } from "../lib/domains.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { DokkuCommands } from "../lib/dokku.js";
import { isSSERequest } from "../lib/sse.js";
import { isValidAppName } from "../lib/apps.js";
import { getParam, safeAuditLog } from "./util.js";
import { streamAction } from "./stream-util.js";

export function registerAppDomainRoutes(app: express.Application): void {
	app.get("/api/apps/:name/domains", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const cacheKey = `apps:${name}:domains`;
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const domains = await getDomains(name);
		set(cacheKey, domains);
		res.json(domains);
	});

	app.post("/api/apps/:name/domains", authMiddleware, requireOperator, async (req, res) => {
		const name = getParam(req.params, "name");
		const { domain } = req.body;

		if (isSSERequest(req)) {
			if (!isValidAppName(name) || !domain) {
				res.status(400).json({ error: "Invalid app name or domain" });
				return;
			}
			await streamAction(req, res, {
				dokkuCommand: DokkuCommands.domainsAdd(name, domain),
				auditAction: "domain:add",
				appName: name,
				auditDetails: { domain },
			});
			return;
		}

		const result = await addDomain(name, domain);

		if (result.exitCode === 0) {
			safeAuditLog(req, "domain:add", name, { app: name, domain });
		}

		clearPrefix("apps:");
		res.json(result);
	});

	app.delete(
		"/api/apps/:name/domains/:domain",
		authMiddleware,
		requireOperator,
		async (req, res) => {
			const name = getParam(req.params, "name");
			const domain = getParam(req.params, "domain");

			if (isSSERequest(req)) {
				if (!isValidAppName(name) || !domain) {
					res.status(400).json({ error: "Invalid app name or domain" });
					return;
				}
				await streamAction(req, res, {
					dokkuCommand: DokkuCommands.domainsRemove(name, domain),
					auditAction: "domain:remove",
					appName: name,
					auditDetails: { domain },
				});
				return;
			}

			const result = await removeDomain(name, domain);

			if (result.exitCode === 0) {
				safeAuditLog(req, "domain:remove", name, { app: name, domain });
			}

			clearPrefix("apps:");
			res.json(result);
		}
	);
}
