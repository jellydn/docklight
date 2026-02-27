import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.DOCKLIGHT_SECRET || "docklight-default-secret-change-in-production";
const PASSWORD = process.env.DOCKLIGHT_PASSWORD;

export interface JWTPayload {
	authenticated: boolean;
	iat?: number;
	exp?: number;
}

if (!PASSWORD) {
	console.warn(
		"WARNING: DOCKLIGHT_PASSWORD environment variable not set. Set this for production!"
	);
}

if (!process.env.DOCKLIGHT_SECRET) {
	console.warn(
		"WARNING: DOCKLIGHT_SECRET environment variable not set. Using default secret is insecure!"
	);
}

export function generateToken(): string {
	return jwt.sign({ authenticated: true }, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JWTPayload | null {
	try {
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch (_error) {
		return null;
	}
}

export function login(password: string): boolean {
	return password === PASSWORD;
}

export function setAuthCookie(res: Response): void {
	const token = generateToken();
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

	next();
}
