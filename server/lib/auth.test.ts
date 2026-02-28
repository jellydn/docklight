import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("./db.js", () => ({
	getUserByUsername: vi.fn(),
}));

vi.mock("./logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

import { getUserByUsername } from "./db.js";
import {
	hashPassword,
	verifyPassword,
	login,
	loginWithCredentials,
	generateToken,
	verifyToken,
	authMiddleware,
	requireRole,
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

describe("login (legacy)", () => {
	beforeEach(() => {
		vi.stubEnv("DOCKLIGHT_PASSWORD", "testpassword");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("should return true for correct password", () => {
		expect(login("testpassword")).toBe(true);
	});

	it("should return false for incorrect password", () => {
		expect(login("wrongpassword")).toBe(false);
	});

	it("should return false for non-string password", () => {
		expect(login(123)).toBe(false);
	});
});

describe("loginWithCredentials", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return null for non-string inputs", async () => {
		const result = await loginWithCredentials(null, "pass");
		expect(result).toBeNull();
	});

	it("should return null when user not found", async () => {
		vi.mocked(getUserByUsername).mockReturnValue(null);
		const result = await loginWithCredentials("alice", "pass");
		expect(result).toBeNull();
	});

	it("should return null for wrong password", async () => {
		const hash = await hashPassword("correctpassword");
		vi.mocked(getUserByUsername).mockReturnValue({
			id: 1,
			username: "alice",
			password_hash: hash,
			role: "admin",
			createdAt: new Date().toISOString(),
		});
		const result = await loginWithCredentials("alice", "wrongpassword");
		expect(result).toBeNull();
	});

	it("should return user info for correct credentials", async () => {
		const hash = await hashPassword("correctpassword");
		vi.mocked(getUserByUsername).mockReturnValue({
			id: 1,
			username: "alice",
			password_hash: hash,
			role: "admin",
			createdAt: new Date().toISOString(),
		});
		const result = await loginWithCredentials("alice", "correctpassword");
		expect(result).toEqual({ id: 1, username: "alice", role: "admin" });
	});
});

describe("generateToken / verifyToken", () => {
	it("should generate a verifiable token without user info (legacy)", () => {
		const token = generateToken();
		const payload = verifyToken(token);
		expect(payload?.authenticated).toBe(true);
		expect(payload?.userId).toBeUndefined();
	});

	it("should include user info in token when provided", () => {
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
	it("should allow legacy token (no role) through", () => {
		const token = generateToken(); // no user → no role
		const req = {
			cookies: { session: token },
			user: { authenticated: true },
		} as unknown as Request;
		const res = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn(),
		} as unknown as Response;
		const next = vi.fn() as NextFunction;

		requireRole("admin")(req, res, next);

		expect(next).toHaveBeenCalled();
	});

	it("should allow matching role", () => {
		const req = {
			user: { authenticated: true, userId: 1, username: "alice", role: "admin" },
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
