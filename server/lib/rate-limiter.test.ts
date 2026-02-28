import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express, { type RequestHandler } from "express";
import rateLimit, { ipKeyGenerator, MemoryStore } from "express-rate-limit";

vi.mock("./logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

/**
 * Creates a fresh rate limiter instance for testing.
 * Each instance has its own MemoryStore to avoid state leakage between tests.
 */
function createTestRateLimiter(store: MemoryStore): RequestHandler {
	return rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 5, // 5 attempts per window
		standardHeaders: true,
		legacyHeaders: false,
		skipFailedRequests: false,
		skipSuccessfulRequests: false,
		handler: (_req, res) => {
			const retryAfter = Math.ceil(15 * 60);
			res.status(429).set("Retry-After", String(retryAfter)).json({
				error: "Too many login attempts. Please try again later.",
				retryAfter: `${retryAfter} seconds`,
			});
		},
		keyGenerator: (req) => {
			// Generate the key using ipKeyGenerator helper
			return ipKeyGenerator(req.ip ?? "::ffff:127.0.0.1");
		},
		store,
	});
}

/**
 * Creates a test Express app with the given rate limiter.
 */
function createTestApp(rateLimiter: RequestHandler): express.Application {
	const app = express();
	app.use(express.json());
	app.set("trust proxy", true); // Enable trust proxy for X-Forwarded-For header
	app.post("/api/auth/login", rateLimiter, (_req, res) => {
		res.json({ success: true });
	});
	return app;
}

describe("authRateLimiter", () => {
	describe("rate limiting behavior", () => {
		it("should allow requests within the rate limit", async () => {
			const store = new MemoryStore();
			const rateLimiter = createTestRateLimiter(store);
			const app = createTestApp(rateLimiter);

			// Make 3 requests sequentially
			for (let i = 0; i < 3; i++) {
				const response = await request(app)
					.post("/api/auth/login")
					.send({ password: "test" });
				expect(response.status).toBe(200);
				expect(response.body).toEqual({ success: true });
			}
		});

		it("should block requests after exceeding the rate limit", async () => {
			const store = new MemoryStore();
			const rateLimiter = createTestRateLimiter(store);
			const app = createTestApp(rateLimiter);

			// Make 5 requests - all should succeed
			for (let i = 0; i < 5; i++) {
				const response = await request(app)
					.post("/api/auth/login")
					.send({ password: "test" });
				expect(response.status).toBe(200);
			}

			// 6th request should be rate limited
			const rateLimitedResponse = await request(app)
				.post("/api/auth/login")
				.send({ password: "test" });

			expect(rateLimitedResponse.status).toBe(429);
			expect(rateLimitedResponse.body).toEqual({
				error: "Too many login attempts. Please try again later.",
				retryAfter: "900 seconds",
			});
		});

		it("should return correct headers on rate limit exceeded", async () => {
			const store = new MemoryStore();
			const rateLimiter = createTestRateLimiter(store);
			const app = createTestApp(rateLimiter);

			// Make 5 successful requests
			for (let i = 0; i < 5; i++) {
				await request(app).post("/api/auth/login").send({ password: "test" });
			}

			// 6th request should trigger rate limit
			const rateLimitedResponse = await request(app)
				.post("/api/auth/login")
				.send({ password: "test" });

			expect(rateLimitedResponse.status).toBe(429);
			expect(rateLimitedResponse.headers["retry-after"]).toBeDefined();
			expect(rateLimitedResponse.headers["retry-after"]).toBe("900");
		});

		it("should count all requests regardless of success or failure", async () => {
			const store = new MemoryStore();
			const rateLimiter = createTestRateLimiter(store);
			const app = express();
			app.use(express.json());
			app.set("trust proxy", true);
			app.post("/api/auth/fail", rateLimiter, (_req, res) => {
				res.status(401).json({ error: "Invalid password" });
			});

			// Make 5 failed requests - all should return 401
			for (let i = 0; i < 5; i++) {
				const response = await request(app)
					.post("/api/auth/fail")
					.send({ password: "wrong" });
				expect(response.status).toBe(401);
			}

			// 6th failed request should be rate limited
			const rateLimitedResponse = await request(app)
				.post("/api/auth/fail")
				.send({ password: "wrong" });

			expect(rateLimitedResponse.status).toBe(429);
		});

		it("should track requests separately by IP address", async () => {
			const store = new MemoryStore();
			const rateLimiter = createTestRateLimiter(store);
			const app = createTestApp(rateLimiter);

			const makeRequestFromIp = async (ip: string) =>
				request(app)
					.post("/api/auth/login")
					.set("X-Forwarded-For", ip)
					.send({ password: "test" });

			// First IP makes 5 requests - all should succeed
			for (let i = 0; i < 5; i++) {
				const response = await makeRequestFromIp("192.168.1.1");
				expect(response.status).toBe(200);
			}

			// First IP tries again - should be rate limited
			const ip1RateLimited = await makeRequestFromIp("192.168.1.1");
			expect(ip1RateLimited.status).toBe(429);

			// Second IP makes 5 requests - all should succeed (different IP)
			for (let i = 0; i < 5; i++) {
				const response = await makeRequestFromIp("192.168.1.2");
				expect(response.status).toBe(200);
			}

			// Second IP tries again - should also be rate limited
			const ip2RateLimited = await makeRequestFromIp("192.168.1.2");
			expect(ip2RateLimited.status).toBe(429);
		});

		it("should return rate limit info in standard headers", async () => {
			const store = new MemoryStore();
			const rateLimiter = createTestRateLimiter(store);
			const app = createTestApp(rateLimiter);

			// Make a request
			const response = await request(app)
				.post("/api/auth/login")
				.send({ password: "test" });

			expect(response.status).toBe(200);
			// Standard headers should be present when standardHeaders: true
			expect(response.headers["ratelimit-limit"]).toBeDefined();
			expect(response.headers["ratelimit-remaining"]).toBeDefined();
			expect(response.headers["ratelimit-reset"]).toBeDefined();
		});
	});
});
