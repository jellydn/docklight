import type { RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logger } from "./logger.js";

const WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 5;
const AUTH_CHECK_MAX_REQUESTS = 300;

// Command execution rate limiting (separate from auth rate limit)
const COMMAND_WINDOW_MS = 60 * 1000; // 1 minute
const COMMAND_MAX_REQUESTS = 10;

interface UserCommandHistory {
	timestamps: number[];
}

const userCommandHistory = new Map<string, UserCommandHistory>();

/**
 * Rate limiter for command execution on a per-user basis.
 * Uses a sliding window approach to limit commands per user.
 */
export class CommandRateLimiter {
	private windowMs: number;
	private maxRequests: number;

	constructor(windowMs: number = COMMAND_WINDOW_MS, maxRequests: number = COMMAND_MAX_REQUESTS) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
	}

	checkLimit(userId: string): { allowed: boolean; resetAt?: Date } {
		const now = Date.now();
		const windowStart = now - this.windowMs;

		let history = userCommandHistory.get(userId);
		if (!history) {
			history = { timestamps: [] };
			userCommandHistory.set(userId, history);
		}

		history.timestamps = history.timestamps.filter((ts) => ts > windowStart);

		if (history.timestamps.length >= this.maxRequests) {
			const oldestTimestamp = Math.min(...history.timestamps);
			const resetAt = new Date(oldestTimestamp + this.windowMs);
			return { allowed: false, resetAt };
		}

		history.timestamps.push(now);

		this.cleanup(userId, windowStart);

		return { allowed: true };
	}

	private cleanup(userId: string, windowStart: number): void {
		const history = userCommandHistory.get(userId);
		if (!history) return;

		history.timestamps = history.timestamps.filter((ts) => ts > windowStart);

		if (history.timestamps.length === 0) {
			userCommandHistory.delete(userId);
		}
	}

	reset(userId: string): void {
		userCommandHistory.delete(userId);
	}

	clearAll(): void {
		userCommandHistory.clear();
	}
}

// Global command rate limiter instance
export const commandRateLimiter = new CommandRateLimiter();

function generateRateLimitKey(req: Parameters<RequestHandler>[0]): string {
	let forwardedFor: string | undefined;
	const forwardedForHeader = req.headers["x-forwarded-for"];
	if (Array.isArray(forwardedForHeader)) {
		forwardedFor = forwardedForHeader[0];
	} else if (typeof forwardedForHeader === "string") {
		forwardedFor = forwardedForHeader.split(",")[0]?.trim();
	}

	let ip = req.ip;

	if (!ip && forwardedFor) {
		ip = forwardedFor;
	}

	if (!ip) {
		const remoteAddress =
			(req.socket && (req.socket as { remoteAddress?: string }).remoteAddress) ||
			(req.connection && (req.connection as { remoteAddress?: string }).remoteAddress);

		if (remoteAddress) {
			ip = remoteAddress;
		} else {
			ip = `unknown-ip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		}
	}

	return ipKeyGenerator(ip);
}

export const authRateLimiter: RequestHandler = rateLimit({
	windowMs: WINDOW_MS,
	max: AUTH_MAX_REQUESTS,
	standardHeaders: true,
	legacyHeaders: false,
	skipFailedRequests: false,
	skipSuccessfulRequests: false,

	handler: (req, res) => {
		const retryAfter = Math.ceil(WINDOW_MS / 1000);

		logger.warn(
			{ ip: req.ip, path: req.path, retryAfter },
			"Rate limit exceeded for authentication endpoint"
		);

		res
			.status(429)
			.set("Retry-After", String(retryAfter))
			.json({
				error: "Too many login attempts. Please try again later.",
				retryAfter: `${retryAfter} seconds`,
			});
	},

	keyGenerator: generateRateLimitKey,
});

export const authCheckRateLimiter: RequestHandler = rateLimit({
	windowMs: WINDOW_MS,
	max: AUTH_CHECK_MAX_REQUESTS,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: generateRateLimitKey,
});

const ADMIN_MAX_REQUESTS = 30;

export const adminRateLimiter: RequestHandler = rateLimit({
	windowMs: WINDOW_MS,
	max: ADMIN_MAX_REQUESTS,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: generateRateLimitKey,
});
