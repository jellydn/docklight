import type { RequestHandler } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { randomUUID } from "crypto";
import { logger } from "./logger.js";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_REQUESTS = 5;

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
	standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
	legacyHeaders: false, // Disable `X-RateLimit-*` headers
	skipFailedRequests: false, // Count all requests, including failed ones
	skipSuccessfulRequests: false, // Count all requests, including successful ones

	/**
	 * Custom handler for rate limit exceeded responses.
	 * Logs the rate limit event and returns a 429 status with retry-after header.
	 */
	handler: (req, res) => {
		const retryAfter = Math.ceil(WINDOW_MS / 1000);

		logger.warn(
			{
				ip: req.ip,
				path: req.path,
				retryAfter,
			},
			"Rate limit exceeded for authentication endpoint"
		);

		res.status(429).set("Retry-After", String(retryAfter)).json({
			error: "Too many login attempts. Please try again later.",
			retryAfter: `${retryAfter} seconds`,
		});
	},

	/**
	 * Key generator function that uses the client's IP address.
	 * Uses ipKeyGenerator helper for proper IPv6 support.
	 * Falls back to random UUID if IP cannot be determined.
	 */
	keyGenerator: (req) => {
		if (req.ip) {
			return ipKeyGenerator(req.ip);
		}

		logger.warn({ path: req.path }, "Could not determine IP for rate limiting. Using random key as fallback.");
		return randomUUID();
	},
});
