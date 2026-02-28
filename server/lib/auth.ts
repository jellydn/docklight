import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import type { UserRole } from "./db.js";
import { getUserByUsername } from "./db.js";
import { logger } from "./logger.js";

const scryptAsync = promisify(scrypt);

const JWT_SECRET = process.env.DOCKLIGHT_SECRET || "docklight-default-secret-change-in-production";
const PASSWORD = process.env.DOCKLIGHT_PASSWORD;

export interface JWTPayload {
	authenticated: boolean;
	userId?: number;
	username?: string;
	role?: UserRole;
	iat?: number;
	exp?: number;
}

// Augment Express Request to carry decoded JWT user info
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			user?: JWTPayload;
		}
	}
}

if (!PASSWORD) {
	logger.warn("DOCKLIGHT_PASSWORD environment variable not set. Set this for production!");
}

if (!process.env.DOCKLIGHT_SECRET) {
	logger.warn("DOCKLIGHT_SECRET environment variable not set. Using default secret is insecure!");
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString("hex");
	const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
	return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	try {
		const [salt, key] = hash.split(":");
		if (!salt || !key) return false;
		const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
		const keyBuffer = Buffer.from(key, "hex");
		if (derivedKey.length !== keyBuffer.length) return false;
		return timingSafeEqual(derivedKey, keyBuffer);
	} catch {
		return false;
	}
}

export function generateToken(
	user?: { id: number; username: string; role: UserRole } | null
): string {
	const payload: JWTPayload = { authenticated: true };
	if (user) {
		payload.userId = user.id;
		payload.username = user.username;
		payload.role = user.role;
	}
	return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JWTPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch (_error) {
		return null;
	}
}

/** Legacy single-password login (DOCKLIGHT_PASSWORD env var). */
export function login(password: unknown): boolean {
	const envPassword = process.env.DOCKLIGHT_PASSWORD;
	if (!envPassword) {
		return false;
	}

	if (typeof password !== "string") {
		return false;
	}

	return password === envPassword;
}

/** Multi-user login: validates username + password against the users table. */
export async function loginWithCredentials(
	username: unknown,
	password: unknown
): Promise<{ id: number; username: string; role: UserRole } | null> {
	if (typeof username !== "string" || typeof password !== "string") {
		return null;
	}

	const user = getUserByUsername(username);
	if (!user) return null;

	const valid = await verifyPassword(password, user.password_hash);
	if (!valid) return null;

	return { id: user.id, username: user.username, role: user.role };
}

export function setAuthCookie(
	res: Response,
	user?: { id: number; username: string; role: UserRole } | null
): void {
	const token = generateToken(user);
	res.cookie("session", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 24 * 60 * 60 * 1000,
	});
}

export function clearAuthCookie(res: Response): void {
	res.clearCookie("session");
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
	const token = req.cookies.session;

	if (!token) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	const payload = verifyToken(token);
	if (!payload || !payload.authenticated) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	req.user = payload;
	next();
}

/**
 * Returns a middleware that only allows users with one of the specified roles.
 * When no role is present in the JWT (legacy single-password auth), the request
 * is allowed through for backward compatibility.
 */
export function requireRole(
	...roles: UserRole[]
): (req: Request, res: Response, next: NextFunction) => void {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = req.user;
		// Legacy auth token carries no role → allow through for backward compat
		if (!user?.role) {
			next();
			return;
		}
		if (!roles.includes(user.role)) {
			res.status(403).json({ error: "Forbidden" });
			return;
		}
		next();
	};
}

export const requireAdmin = requireRole("admin");
export const requireOperator = requireRole("admin", "operator");
