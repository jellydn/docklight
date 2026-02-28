import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response } from "express";

// Set test password before importing the module
// Note: These env vars must be set before importing the module for the tests to work
process.env.DOCKLIGHT_PASSWORD = "test-password";
process.env.DOCKLIGHT_SECRET = "test-secret-for-auth-module";
process.env.NODE_ENV = "test";

// Now import the module after setting the env vars
import {
	generateToken,
	verifyToken,
	login,
	setAuthCookie,
	clearAuthCookie,
	authMiddleware,
} from "./auth.js";

describe("auth functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("login", () => {
		it("should return true for correct password", () => {
			expect(login("test-password")).toBe(true);
		});

		it("should return false for incorrect password", () => {
			expect(login("wrong-password")).toBe(false);
		});

		it("should return false for non-string password", () => {
			expect(login(null)).toBe(false);
			expect(login(undefined)).toBe(false);
			expect(login(123)).toBe(false);
		});
	});

	describe("token generation and verification", () => {
		it("should generate valid tokens", () => {
			const token = generateToken();
			expect(typeof token).toBe("string");
			expect(token.length).toBeGreaterThan(0);
		});

		it("should verify valid tokens", () => {
			const token = generateToken();
			const payload = verifyToken(token);
			expect(payload).not.toBeNull();
			expect(payload?.authenticated).toBe(true);
		});

		it("should not verify invalid tokens", () => {
			expect(verifyToken("invalid-token")).toBeNull();
		});

		it("should include iat and exp in payload", () => {
			const token = generateToken();
			const payload = verifyToken(token);
			expect(payload?.iat).toBeDefined();
			expect(payload?.exp).toBeDefined();
		});
	});

	describe("authMiddleware", () => {
		it("should pass with valid token", () => {
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

		it("should block without token", () => {
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

		it("should block with invalid token", () => {
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
		it("should set auth cookie", () => {
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

		it("should use secure flag in production", () => {
			process.env.NODE_ENV = "production";

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

		it("should not use secure flag in development", () => {
			process.env.NODE_ENV = "development";

			const cookie = vi.fn();
			const res = { cookie } as unknown as Response;

			setAuthCookie(res);

			const call = cookie.mock.calls[0];
			expect(call[2]).toHaveProperty("secure", false);

			process.env.NODE_ENV = "test";
		});

		it("should clear auth cookie", () => {
			const clearCookie = vi.fn();
			const res = { clearCookie } as unknown as Response;

			clearAuthCookie(res);

			expect(clearCookie).toHaveBeenCalledWith("session");
		});
	});
});
