import type express from "express";
import { authMiddleware, clearAuthCookie, login, setAuthCookie } from "../lib/auth.js";
import { authRateLimiter, authCheckRateLimiter } from "../lib/rate-limiter.js";
import { insertAuditLog } from "../lib/db.js";
import { getIpAddress } from "./util.js";

export function registerAuthRoutes(app: express.Application): void {
	app.post("/api/auth/login", authRateLimiter, async (req, res) => {
		const { username, password } = req.body;

		if (!username) {
			res.status(400).json({ error: "Username is required" });
			return;
		}

		const user = await login(username, password);
		if (!user) {
			res.status(401).json({ error: "Invalid credentials" });
			return;
		}

		setAuthCookie(res, user);

		// Audit log successful login
		insertAuditLog(user.id, "login", null, JSON.stringify({ username }), getIpAddress(req));

		res.json({ success: true });
	});

	app.post("/api/auth/logout", authMiddleware, (req, res) => {
		const user = req.user;

		// Audit log logout before clearing cookie
		insertAuditLog(
			user?.userId ?? null,
			"logout",
			null,
			user?.username ? JSON.stringify({ username: user.username }) : null,
			getIpAddress(req)
		);

		clearAuthCookie(res);
		res.json({ success: true });
	});

	app.get("/api/auth/me", authCheckRateLimiter, authMiddleware, (req, res) => {
		const user = req.user;
		res.json({
			authenticated: true,
			user:
				user?.userId !== undefined
					? { id: user.userId, username: user.username, role: user.role }
					: undefined,
		});
	});
}
