import type express from "express";
import { enableSSL, getSSL, renewSSL } from "../lib/ssl.js";
import { authMiddleware } from "../lib/auth.js";
import { getParam } from "./util.js";

export function registerAppSSLRoutes(app: express.Application): void {
	app.get("/api/apps/:name/ssl", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const ssl = await getSSL(name);
		res.json(ssl);
	});

	app.post("/api/apps/:name/ssl/enable", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const { email } = req.body ?? {};
		const result =
			typeof email === "string" && email.trim().length > 0
				? await enableSSL(name, email)
				: await enableSSL(name);
		res.json(result);
	});

	app.post("/api/apps/:name/ssl/renew", authMiddleware, async (req, res) => {
		const name = getParam(req.params, "name");
		const result = await renewSSL(name);
		res.json(result);
	});
}
