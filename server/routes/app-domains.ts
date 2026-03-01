import type express from "express";
import { addDomain, getDomains, removeDomain } from "../lib/domains.js";
import { clearPrefix } from "../lib/cache.js";
import { authMiddleware, requireOperator } from "../lib/auth.js";
import { getParam } from "./util.js";

export function registerAppDomainRoutes(app: express.Application): void {
	app.get("/api/apps/:name/domains", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const domains = await getDomains(name);
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
