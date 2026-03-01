import type { RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logger } from "./logger.js";

const WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 5;
const AUTH_CHECK_MAX_REQUESTS = 300;

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
