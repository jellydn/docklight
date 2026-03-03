import type { RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logger } from "./logger.js";

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
	if (value === undefined) return defaultValue;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const WINDOW_MS = parsePositiveInt(process.env.DOCKLIGHT_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

/**
 * Gets a rate limit value from environment variable, with development/production defaults.
 */
function getRateLimit(envVar: string | undefined, devValue: number, prodValue: number): number {
	return Number(envVar ?? (IS_DEVELOPMENT ? devValue : prodValue));
}

const AUTH_MAX_REQUESTS = getRateLimit(
	process.env.DOCKLIGHT_AUTH_MAX_REQUESTS,
	1000,
	5
);
const AUTH_CHECK_MAX_REQUESTS = getRateLimit(
	process.env.DOCKLIGHT_AUTH_CHECK_MAX_REQUESTS,
	10_000,
	300
);

// Command execution rate limiting (separate from auth rate limit)
const DEFAULT_COMMAND_WINDOW_MS = 60 * 1000; // 1 minute
const COMMAND_WINDOW_MS = parsePositiveInt(
	process.env.DOCKLIGHT_COMMAND_WINDOW_MS,
	DEFAULT_COMMAND_WINDOW_MS
);
const COMMAND_MAX_REQUESTS = getRateLimit(
	process.env.DOCKLIGHT_COMMAND_MAX_REQUESTS,
	1000,
	30
);

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

	get windowMsValue(): number {
		return this.windowMs;
	}

	get maxRequestsValue(): number {
		return this.maxRequests;
	}

	checkLimit(userId: string): { allowed: boolean; resetAt?: Date } {
		const now = Date.now();
		const windowStart = now - this.windowMs;

		let history = userCommandHistory.get(userId);
		if (!history) {
			history = { timestamps: [] };
			userCommandHistory.set(userId, history);
		}

		const validTimestamps = history.timestamps.filter((ts) => ts > windowStart);
		history.timestamps = validTimestamps;

		if (validTimestamps.length >= this.maxRequests) {
			const oldestTimestamp = validTimestamps.reduce(
				(min, ts) => Math.min(min, ts),
				validTimestamps[0]
			);
			const resetAt = new Date(oldestTimestamp + this.windowMs);
			return { allowed: false, resetAt };
		}

		history.timestamps.push(now);

		return { allowed: true };
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

const ADMIN_MAX_REQUESTS = getRateLimit(
	process.env.DOCKLIGHT_ADMIN_MAX_REQUESTS,
	1000,
	30
);

export const adminRateLimiter: RequestHandler = rateLimit({
	windowMs: WINDOW_MS,
	max: ADMIN_MAX_REQUESTS,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: generateRateLimitKey,
});
