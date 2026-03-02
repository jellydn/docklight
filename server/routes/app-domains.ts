import type express from "express";
import { addDomain, getDomains, removeDomain } from "../lib/domains.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { getParam } from "./util.js";

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
		const result = await addDomain(name, domain);
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
			const result = await removeDomain(name, domain);
			clearPrefix("apps:");
			res.json(result);
		}
	);
}
