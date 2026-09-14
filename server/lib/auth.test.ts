import express from "express";
import request from "supertest";
import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Mock db and logger before importing auth
vi.mock("./db.js", () => ({
	getUserByUsername: vi.fn(),
	getUserByEmail: vi.fn(),
	findAppPermission: vi.fn(),
}));

vi.mock("./logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

import { findAppPermission, getUserByUsername } from "./db.js";
import {
	hashPassword,
	verifyPassword,
	login,
	generateToken,
	verifyToken,
	authMiddleware,
	requireRole,
	setAuthCookie,
	clearAuthCookie,
	requireAppPermission,
	requireScopedAppPermission,
} from "./auth.js";
import type { JWTPayload } from "./auth.js";

describe("hashPassword / verifyPassword", () => {
	it("should hash and verify a correct password", async () => {
		const hash = await hashPassword("mysecret");
		expect(hash).toContain(":");
		const valid = await verifyPassword("mysecret", hash);
		expect(valid).toBe(true);
	});

	it("should reject an incorrect password", async () => {
		const hash = await hashPassword("mysecret");
		const valid = await verifyPassword("wrongpassword", hash);
		expect(valid).toBe(false);
	});

	it("should return false for malformed hash", async () => {
		const valid = await verifyPassword("password", "notahash");
		expect(valid).toBe(false);
	});
});

describe("login", () => {
	it("should return null when user not found", async () => {
		vi.mocked(getUserByUsername).mockReturnValue(null);
		const result = await login("alice", "pass");
		expect(result).toBeNull();
	});

	it("should return null for wrong password", async () => {
		const hash = await hashPassword("correctpassword");
		vi.mocked(getUserByUsername).mockReturnValue({
			id: 1,
			username: "alice",
			email: null,
			password_hash: hash,
			role: "admin",
			createdAt: new Date().toISOString(),
		});
		const result = await login("alice", "wrongpassword");
		expect(result).toBeNull();
	});

	it("should return user info for correct credentials", async () => {
		const hash = await hashPassword("correctpassword");
		vi.mocked(getUserByUsername).mockReturnValue({
			id: 1,
			username: "alice",
			email: null,
			password_hash: hash,
			role: "admin",
			createdAt: new Date().toISOString(),
		});
		const result = await login("alice", "correctpassword");
		expect(result).toEqual({ id: 1, username: "alice", role: "admin" });
	});
});

describe("generateToken / verifyToken", () => {
	it("should generate a verifiable token with user info", () => {
		const token = generateToken({ id: 1, username: "bob", role: "operator" });
		const payload = verifyToken(token) as JWTPayload;
		expect(payload.authenticated).toBe(true);
		expect(payload.userId).toBe(1);
		expect(payload.username).toBe("bob");
		expect(payload.role).toBe("operator");
	});

	it("should return null for invalid token", () => {
		expect(verifyToken("notavalidtoken")).toBeNull();
	});

	it("should include iat and exp in payload", () => {
		const token = generateToken({ id: 1, username: "test", role: "admin" });
		const payload = verifyToken(token);
		expect(payload?.iat).toBeDefined();
		expect(payload?.exp).toBeDefined();
	});
});

describe("authMiddleware", () => {
	it("should reject request without cookie", () => {
		const req = { cookies: {} } as unknown as Request;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("should reject request with invalid token", () => {
		const req = { cookies: { session: "badtoken" } } as unknown as Request;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("should call next() and attach user for valid token", () => {
		const token = generateToken({ id: 1, username: "alice", role: "admin" });
		const req = { cookies: { session: token } } as unknown as Request;
		const res = {} as Response;
		const next = vi.fn() as NextFunction;

		authMiddleware(req, res, next);

		expect(next).toHaveBeenCalled();
		expect((req as unknown as { user?: JWTPayload }).user?.username).toBe("alice");
	});
});

describe("requireRole", () => {
	it("should reject token without role", () => {
		const token = generateToken({ id: 1, username: "test", role: "admin" });
		const payload = verifyToken(token) as JWTPayload;
		delete (payload as JWTPayload).role;

		const req = {
			cookies: { session: token },
			user: payload,
		} as unknown as Request;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		requireRole("admin")(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	it("should allow matching role", () => {
		const req = {
			user: {
				authenticated: true,
				userId: 1,
				username: "alice",
				role: "admin",
			},
		} as unknown as Request;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		requireRole("admin", "operator")(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it("should reject insufficient role", () => {
		const req = {
			user: { authenticated: true, userId: 2, username: "bob", role: "viewer" },
		} as unknown as Request;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		requireRole("admin")(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(next).not.toHaveBeenCalled();
	});
});

describe("requireAppPermission", () => {
	function runMiddleware(role: "admin" | "operator" | "viewer", action: "update" | "delete") {
		const req = {
			params: { name: "billing" },
			user: { authenticated: true, userId: 7, username: "alice", role },
		} as unknown as Request;
		const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
		const next = vi.fn() as NextFunction;
		requireAppPermission(action, (request) => request.params.name as string)(req, res, next);
		return { res, next };
	}

	it("should let a specific allow override a viewer role", () => {
		vi.mocked(findAppPermission).mockReturnValue("allow");
		const { next } = runMiddleware("viewer", "update");

		expect(next).toHaveBeenCalledOnce();
	});

	it("should let a specific deny override an operator role", () => {
		vi.mocked(findAppPermission).mockReturnValue("deny");
		const { res, next } = runMiddleware("operator", "delete");

		expect(res.status).toHaveBeenCalledWith(403);
		expect(next).not.toHaveBeenCalled();
	});

	it("should preserve role behavior without a matching rule", () => {
		vi.mocked(findAppPermission).mockReturnValue(null);

		expect(runMiddleware("operator", "update").next).toHaveBeenCalledOnce();
		expect(runMiddleware("viewer", "update").res.status).toHaveBeenCalledWith(403);
	});

	it("should always allow admins", () => {
		vi.mocked(findAppPermission).mockReturnValue("deny");
		const { next } = runMiddleware("admin", "delete");

		expect(next).toHaveBeenCalledOnce();
		expect(findAppPermission).not.toHaveBeenCalled();
	});

	it("should map scoped HTTP methods to read, update, and delete actions", () => {
		vi.mocked(findAppPermission).mockReturnValue("allow");
		for (const [method, action] of [
			["GET", "read"],
			["POST", "update"],
			["DELETE", "delete"],
		] as const) {
			const req = {
				method,
				path: "/",
				params: { name: "billing" },
				user: { authenticated: true, userId: 7, username: "alice", role: "viewer" },
			} as unknown as Request;
			requireScopedAppPermission(req, {} as Response, vi.fn());
			expect(findAppPermission).toHaveBeenLastCalledWith(7, action, "billing");
		}
	});

	it("should treat deletion of an app sub-resource as an app update", () => {
		vi.mocked(findAppPermission).mockReturnValue("allow");
		const req = {
			method: "DELETE",
			path: "/config/API_KEY",
			params: { name: "billing" },
			user: { authenticated: true, userId: 7, username: "alice", role: "viewer" },
		} as unknown as Request;

		requireScopedAppPermission(req, {} as Response, vi.fn());

		expect(findAppPermission).toHaveBeenLastCalledWith(7, "update", "billing");
	});

	it("should classify mounted app and sub-resource deletion paths", async () => {
		vi.mocked(findAppPermission).mockReturnValue("allow");
		const app = express();
		app.use((req, _res, next) => {
			req.user = { authenticated: true, userId: 7, username: "alice", role: "viewer" };
			next();
		});
		app.use("/api/apps/:name", requireScopedAppPermission);
		app.delete("/api/apps/:name", (_req, res) => res.sendStatus(204));
		app.delete("/api/apps/:name/config/:key", (_req, res) => res.sendStatus(204));

		await request(app).delete("/api/apps/billing").expect(204);
		expect(findAppPermission).toHaveBeenLastCalledWith(7, "delete", "billing");

		await request(app).delete("/api/apps/billing/config/API_KEY").expect(204);
		expect(findAppPermission).toHaveBeenLastCalledWith(7, "update", "billing");
	});
});

describe("cookie management", () => {
	it("should set auth cookie", () => {
		const cookie = vi.fn();
		const res = { cookie } as unknown as Response;

		setAuthCookie(res, { id: 1, username: "test", role: "admin" });

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

		setAuthCookie(res, { id: 1, username: "test", role: "admin" });

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

		setAuthCookie(res, { id: 1, username: "test", role: "admin" });

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
