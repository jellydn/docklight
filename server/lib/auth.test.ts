import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";

describe("auth functions", () => {
	beforeAll(() => {
		vi.resetModules();
		process.env.DOCKLIGHT_PASSWORD = "test-password";
		process.env.DOCKLIGHT_SECRET = "test-secret-for-auth-module";
		process.env.NODE_ENV = "test";
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("login", () => {
		it("should return true for correct password", async () => {
			const { login } = await import("./auth.js");
			expect(login("test-password")).toBe(true);
		});

		it("should return false for incorrect password", async () => {
			const { login } = await import("./auth.js");
			expect(login("wrong-password")).toBe(false);
		});

		it("should return false for non-string password", async () => {
			const { login } = await import("./auth.js");
			expect(login(null)).toBe(false);
			expect(login(undefined)).toBe(false);
			expect(login(123)).toBe(false);
		});
	});

	describe("token generation and verification", () => {
		it("should generate valid tokens", async () => {
			const { generateToken } = await import("./auth.js");
			const token = generateToken();
			expect(typeof token).toBe("string");
			expect(token.length).toBeGreaterThan(0);
		});

		it("should verify valid tokens", async () => {
			const { generateToken, verifyToken } = await import("./auth.js");
			const token = generateToken();
			const payload = verifyToken(token);
			expect(payload).not.toBeNull();
			expect(payload?.authenticated).toBe(true);
		});

		it("should not verify invalid tokens", async () => {
			const { verifyToken } = await import("./auth.js");
			expect(verifyToken("invalid-token")).toBeNull();
		});

		it("should include iat and exp in payload", async () => {
			const { generateToken, verifyToken } = await import("./auth.js");
			const token = generateToken();
			const payload = verifyToken(token);
			expect(payload?.iat).toBeDefined();
			expect(payload?.exp).toBeDefined();
		});
	});

	describe("authMiddleware", () => {
		it("should pass with valid token", async () => {
			const { generateToken, authMiddleware } = await import("./auth.js");
			const token = generateToken();
			const req = { cookies: { session: token } } as unknown as Request;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;
			const next = vi.fn();

			authMiddleware(req, res, next);

			expect(next).toHaveBeenCalled();
		});

		it("should block without token", async () => {
			const { authMiddleware } = await import("./auth.js");
			const req = { cookies: {} } as unknown as Request;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;
			const next = vi.fn();

			authMiddleware(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
		});

		it("should block with invalid token", async () => {
			const { authMiddleware } = await import("./auth.js");
			const req = { cookies: { session: "invalid-token" } } as unknown as Request;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn(),
			} as unknown as Response;
			const next = vi.fn();

			authMiddleware(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(401);
		});
	});

	describe("cookie management", () => {
		it("should set auth cookie", async () => {
			const { setAuthCookie } = await import("./auth.js");
			const cookie = vi.fn();
			const res = { cookie } as unknown as Response;

			setAuthCookie(res);

			expect(cookie).toHaveBeenCalledWith(
				"session",
				expect.any(String),
				expect.objectContaining({
					httpOnly: true,
					sameSite: "strict",
					maxAge: 24 * 60 * 60 * 1000,
				})
			);
		});

		it("should use secure flag in production", async () => {
			process.env.NODE_ENV = "production";
			const { setAuthCookie } = await import("./auth.js");

			const cookie = vi.fn();
			const res = { cookie } as unknown as Response;

			setAuthCookie(res);

			expect(cookie).toHaveBeenCalledWith(
				"session",
				expect.any(String),
				expect.objectContaining({
					secure: true,
				})
			);

			process.env.NODE_ENV = "test";
		});

		it("should not use secure flag in development", async () => {
			process.env.NODE_ENV = "development";
			const { setAuthCookie } = await import("./auth.js");

			const cookie = vi.fn();
			const res = { cookie } as unknown as Response;

			setAuthCookie(res);

			const call = cookie.mock.calls[0];
			expect(call[2]).toHaveProperty("secure", false);

			process.env.NODE_ENV = "test";
		});

		it("should clear auth cookie", async () => {
			const { clearAuthCookie } = await import("./auth.js");
			const clearCookie = vi.fn();
			const res = { clearCookie } as unknown as Response;

			clearAuthCookie(res);

			expect(clearCookie).toHaveBeenCalledWith("session");
		});
	});
});
