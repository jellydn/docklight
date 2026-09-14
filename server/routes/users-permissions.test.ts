import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/auth.js", () => ({
	authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
	requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
	hashPassword: vi.fn(),
}));

vi.mock("../lib/db.js", () => ({
	getAllUsers: vi.fn(),
	createUser: vi.fn(),
	getUserById: vi.fn(),
	updateUserWithGuard: vi.fn(),
	deleteUser: vi.fn(),
	deleteUserWithAdminGuard: vi.fn(),
	getAppPermissions: vi.fn(),
	replaceAppPermissions: vi.fn(),
}));

vi.mock("../lib/cache.js", () => ({ get: vi.fn(), set: vi.fn(), clearPrefix: vi.fn() }));
vi.mock("./util.js", () => ({ safeAuditLog: vi.fn(), handleDbError: vi.fn() }));

import { getUserById, replaceAppPermissions } from "../lib/db.js";
import { safeAuditLog } from "./util.js";
import { registerUserRoutes } from "./users.js";

function createApp(): express.Express {
	const app = express();
	app.use(express.json());
	registerUserRoutes(app);
	return app;
}

describe("user app permission routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getUserById).mockReturnValue({
			id: 2,
			username: "operator",
			email: null,
			role: "operator",
			createdAt: "2026-01-01T00:00:00Z",
		});
	});

	it("normalizes, saves, and audits app permission rules", async () => {
		vi.mocked(replaceAppPermissions).mockReturnValue([]);

		const response = await request(createApp())
			.put("/api/users/2/permissions")
			.send({
				permissions: [{ action: "delete", effect: "deny", scope: " production " }],
			});

		expect(response.status).toBe(200);
		expect(replaceAppPermissions).toHaveBeenCalledWith(2, [
			{ action: "delete", effect: "deny", scope: "production" },
		]);
		expect(safeAuditLog).toHaveBeenCalledWith(
			expect.anything(),
			"user:permissions:update",
			"operator",
			expect.objectContaining({ resource: "apps" })
		);
	});

	it("rejects duplicate action and scope rules", async () => {
		const response = await request(createApp())
			.put("/api/users/2/permissions")
			.send({
				permissions: [
					{ action: "update", effect: "allow", scope: null },
					{ action: "update", effect: "deny", scope: "" },
				],
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual({ error: "Duplicate app permission" });
		expect(replaceAppPermissions).not.toHaveBeenCalled();
	});
});
