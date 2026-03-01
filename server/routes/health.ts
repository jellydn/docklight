import type express from "express";

export function registerHealthRoutes(app: express.Application): void {
	app.get("/api/health", (_req, res) => {
		res.json({ status: "ok" });
	});
}
