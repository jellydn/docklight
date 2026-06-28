import { randomBytes } from "crypto";
import type express from "express";
import {
	authMiddleware,
	clearAuthCookie,
	hashPassword,
	hashResetToken,
	login,
	setAuthCookie,
} from "../lib/auth.js";
import {
	createPasswordResetToken,
	deleteExpiredPasswordResetTokens,
	getPasswordResetTokenByHash,
	getUserByEmail,
	resetPasswordWithToken,
} from "../lib/db.js";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "../lib/email.js";
import { authRateLimiter, authCheckRateLimiter } from "../lib/rate-limiter.js";
import { safeAuditLogWithUserId } from "./util.js";

function normalizeEmail(value: unknown): string {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

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
		safeAuditLogWithUserId(req, user.id, "login", null, { username });
		res.json({ success: true });
	});

	app.post("/api/auth/forgot-password", authRateLimiter, async (req, res) => {
		const email = normalizeEmail(req.body?.email);
		if (!email) {
			res.status(400).json({ error: "Email is required" });
			return;
		}

		deleteExpiredPasswordResetTokens();

		const user = getUserByEmail(email);
		if (user?.email) {
			const token = randomBytes(32).toString("hex");
			const tokenHash = hashResetToken(token);
			const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
			const resetUrl = buildPasswordResetUrl(token);
			createPasswordResetToken(user.id, tokenHash, expiresAt);
			safeAuditLogWithUserId(req, user.id, "password:reset-request", null, { email });

			if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
				await sendPasswordResetEmail({ to: user.email, username: user.username, resetUrl });
				res.json({ success: true });
				return;
			}

			if (process.env.NODE_ENV !== "production") {
				res.json({ success: true, resetToken: token, resetUrl });
				return;
			}
		}

		res.json({ success: true });
	});

	app.post("/api/auth/reset-password", authRateLimiter, async (req, res) => {
		const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
		const password = typeof req.body?.password === "string" ? req.body.password : "";

		if (!token) {
			res.status(400).json({ error: "Token is required" });
			return;
		}
		if (!password) {
			res.status(400).json({ error: "Password is required" });
			return;
		}

		const tokenHash = hashResetToken(token);
		const resetToken = getPasswordResetTokenByHash(tokenHash);
		if (
			!resetToken ||
			resetToken.usedAt !== null ||
			new Date(resetToken.expiresAt).getTime() <= Date.now()
		) {
			res.status(400).json({ error: "Invalid or expired token" });
			return;
		}

		const success = resetPasswordWithToken(
			tokenHash,
			resetToken.userId,
			await hashPassword(password)
		);
		if (!success) {
			res.status(400).json({ error: "Invalid or expired token" });
			return;
		}
		safeAuditLogWithUserId(req, resetToken.userId, "password:reset", null, null);
		res.json({ success: true });
	});

	app.post("/api/auth/logout", authMiddleware, (req, res) => {
		const user = req.user;

		safeAuditLogWithUserId(
			req,
			user?.userId ?? null,
			"logout",
			null,
			user?.username ? { username: user.username } : null
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
