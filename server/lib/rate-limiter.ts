import type { RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { logger } from "./logger.js";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_REQUESTS = 5;
const AUTH_CHECK_MAX_REQUESTS = 300; // lenient limit for status-check endpoints

/**
 * Generates a deterministic rate limit key from the request.
 * Uses ipKeyGenerator helper for proper IPv6 support.
 * Falls back to x-forwarded-for header, then to a stable 'unknown-ip' key.
 */
function generateRateLimitKey(req: Parameters<RequestHandler>[0]): string {
	if ("ip" in req && req.ip) {
		return ipKeyGenerator(req.ip);
	}

	const forwardedFor = req.headers["x-forwarded-for"];
	const fallbackIp = Array.isArray(forwardedFor)
		? forwardedFor[0]
		: forwardedFor || "unknown-ip";

	const ip =
		typeof fallbackIp === "string" && fallbackIp.length > 0
			? fallbackIp
			: "unknown-ip";

	return ipKeyGenerator(ip);
}

/**
 * Rate limiter configuration for authentication endpoints.
 *
 * Limits requests based on IP address with:
 * - 15-minute window
 * - 5 attempts per window
 * - Returns 429 status with retry-after header when limit exceeded
 */
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

/**
 * Rate limiter for auth status-check endpoints (e.g. /auth/me, /auth/mode).
 * Allows up to 300 requests per 15-minute window to avoid impacting normal usage
 * while still preventing enumeration or abuse.
 */
export const authCheckRateLimiter: RequestHandler = rateLimit({
	windowMs: WINDOW_MS,
	max: AUTH_CHECK_MAX_REQUESTS,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: generateRateLimitKey,
});
