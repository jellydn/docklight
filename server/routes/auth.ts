import type express from "express";
import {
	authMiddleware,
	clearAuthCookie,
	login,
	loginWithCredentials,
	setAuthCookie,
} from "../lib/auth.js";
import { getUserCount } from "../lib/db.js";
import { authRateLimiter, authCheckRateLimiter } from "../lib/rate-limiter.js";

export function registerAuthRoutes(app: express.Application): void {
	app.post("/api/auth/login", authRateLimiter, async (req, res) => {
		const { username, password } = req.body;
		const multiUser = getUserCount() > 0;

		if (multiUser) {
			if (!username) {
				res.status(400).json({ error: "Username is required" });
				return;
			}
			const user = await loginWithCredentials(username, password);
			if (!user) {
				res.status(401).json({ error: "Invalid credentials" });
				return;
			}
			setAuthCookie(res, user);
			res.json({ success: true });
			return;
		}

		if (!login(password)) {
			res.status(401).json({ error: "Invalid password" });
			return;
		}
		setAuthCookie(res);
		res.json({ success: true });
	});

	app.post("/api/auth/logout", (_req, res) => {
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

	app.get("/api/auth/mode", authCheckRateLimiter, (_req, res) => {
		res.json({ multiUser: getUserCount() > 0 });
	});
}
