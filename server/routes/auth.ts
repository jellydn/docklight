import { randomBytes } from "crypto";
import type express from "express";
import QRCode from "qrcode";
import {
	authMiddleware,
	clearAuthCookie,
	hashPassword,
	hashResetToken,
	login,
	setAuthCookie,
} from "../lib/auth.js";
import {
	consumeTwoFactorBackupCode,
	createPasswordResetToken,
	deleteExpiredPasswordResetTokens,
	disableTwoFactor,
	enableTwoFactor,
	getUserByEmail,
	getAppPermissions,
	getUserTwoFactorState,
	resetPasswordWithToken,
	savePendingTwoFactorSecret,
} from "../lib/db.js";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "../lib/email.js";
import { authRateLimiter, authCheckRateLimiter } from "../lib/rate-limiter.js";
import {
	createTwoFactorSetup,
	decryptTwoFactorSecret,
	encryptTwoFactorSecret,
	generateRecoveryCodes,
	hashRecoveryCode,
	verifyTotp,
} from "../lib/two-factor.js";
import { safeAuditLogWithUserId } from "./util.js";

function normalizeEmail(value: unknown): string {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function registerAuthRoutes(app: express.Application): void {
	app.post("/api/auth/login", authRateLimiter, async (req, res) => {
		const { username, password, twoFactorCode } = req.body;

		if (!username) {
			res.status(400).json({ error: "Username is required" });
			return;
		}

		const user = await login(username, password);
		if (!user) {
			res.status(401).json({ error: "Invalid credentials" });
			return;
		}

		const twoFactorState = getUserTwoFactorState(user.id);
		if (twoFactorState?.enabled && twoFactorState.secret) {
			if (typeof twoFactorCode !== "string" || !twoFactorCode.trim()) {
				res.json({ success: false, requiresTwoFactor: true });
				return;
			}

			let validCode = false;
			try {
				validCode = verifyTotp(twoFactorCode.trim(), decryptTwoFactorSecret(twoFactorState.secret));
			} catch {
				validCode = false;
			}
			if (!validCode) {
				validCode = consumeTwoFactorBackupCode(user.id, hashRecoveryCode(twoFactorCode));
			}
			if (!validCode) {
				res.status(401).json({ error: "Invalid two-factor code" });
				return;
			}
		}

		setAuthCookie(res, {
			...user,
			twoFactorAuthenticated: twoFactorState?.enabled ?? false,
		});
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
		const userId = resetPasswordWithToken(tokenHash, await hashPassword(password));
		if (userId === null) {
			res.status(400).json({ error: "Invalid or expired token" });
			return;
		}
		safeAuditLogWithUserId(req, userId, "password:reset", null, null);
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

	app.get("/api/auth/2fa", authCheckRateLimiter, authMiddleware, (req, res) => {
		const userId = req.user?.userId;
		if (userId === undefined) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		const state = getUserTwoFactorState(userId);
		res.json({ enabled: state?.enabled ?? false });
	});

	app.post("/api/auth/2fa/setup", authRateLimiter, authMiddleware, async (req, res) => {
		const userId = req.user?.userId;
		const username = req.user?.username;
		if (userId === undefined || !username) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}
		if (getUserTwoFactorState(userId)?.enabled) {
			res.status(409).json({ error: "Two-factor authentication is already enabled" });
			return;
		}

		const setup = createTwoFactorSetup(username);
		savePendingTwoFactorSecret(userId, encryptTwoFactorSecret(setup.secret));
		res.json({
			secret: setup.secret,
			qrCode: await QRCode.toDataURL(setup.otpauthUrl, { width: 240, margin: 1 }),
		});
	});

	app.post("/api/auth/2fa/verify", authRateLimiter, authMiddleware, (req, res) => {
		const userId = req.user?.userId;
		const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
		if (userId === undefined) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}
		if (!code) {
			res.status(400).json({ error: "Two-factor code is required" });
			return;
		}

		const state = getUserTwoFactorState(userId);
		if (!state?.pendingSecret) {
			res.status(400).json({ error: "Start two-factor setup first" });
			return;
		}

		let secret: string;
		try {
			secret = decryptTwoFactorSecret(state.pendingSecret);
		} catch {
			res.status(400).json({ error: "Start two-factor setup again" });
			return;
		}
		if (!verifyTotp(code, secret)) {
			res.status(400).json({ error: "Invalid two-factor code" });
			return;
		}

		const recoveryCodes = generateRecoveryCodes();
		enableTwoFactor(userId, state.pendingSecret, recoveryCodes.map(hashRecoveryCode));
		safeAuditLogWithUserId(req, userId, "two-factor:enable", null, null);
		res.json({ enabled: true, recoveryCodes });
	});

	app.post("/api/auth/2fa/disable", authRateLimiter, authMiddleware, async (req, res) => {
		const userId = req.user?.userId;
		const username = req.user?.username;
		const password = typeof req.body?.password === "string" ? req.body.password : "";
		if (userId === undefined || !username) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}
		if (!password) {
			res.status(400).json({ error: "Password is required" });
			return;
		}

		const user = await login(username, password);
		if (!user || user.id !== userId) {
			res.status(401).json({ error: "Invalid password" });
			return;
		}

		disableTwoFactor(userId);
		safeAuditLogWithUserId(req, userId, "two-factor:disable", null, null);
		res.json({ enabled: false });
	});

	app.get("/api/auth/me", authCheckRateLimiter, authMiddleware, (req, res) => {
		const user = req.user;
		const appPermissions = user?.userId !== undefined ? getAppPermissions(user.userId) : [];
		res.json({
			authenticated: true,
			user:
				user?.userId !== undefined
					? {
							id: user.userId,
							username: user.username,
							role: user.role,
							twoFactorAuthenticated: user.twoFactorAuthenticated ?? false,
							appPermissions,
						}
					: undefined,
		});
	});
}
