import type { RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logger } from "./logger.js";

const WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 5;
const AUTH_CHECK_MAX_REQUESTS = 300;

function generateRateLimitKey(req: Parameters<RequestHandler>[0]): string {
	if ("ip" in req && req.ip) {
		return ipKeyGenerator(req.ip);
	}

	const forwardedFor = req.headers["x-forwarded-for"];
	const fallbackIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || "unknown-ip";

	const ip = typeof fallbackIp === "string" && fallbackIp.length > 0 ? fallbackIp : "unknown-ip";

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
