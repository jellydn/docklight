import type express from "express";
import {
	getAllUsers,
	createUser,
	getUserById,
	updateUser,
	deleteUser,
	type UserRole,
	demoteAdminWithGuard,
	deleteUserWithAdminGuard,
	insertAuditLog,
} from "../lib/db.js";
import { authMiddleware, requireAdmin, hashPassword } from "../lib/auth.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { getIpAddress } from "./util.js";

export function registerUserRoutes(app: express.Application): void {
	app.get("/api/users", authMiddleware, requireAdmin, (_req, res) => {
		const cacheKey = "users:list";
		const cached = get(cacheKey);

		if (cached) {
			res.json(cached);
			return;
		}

		const users = getAllUsers();
		set(cacheKey, users);
		res.json(users);
	});

	app.post("/api/users", authMiddleware, requireAdmin, async (req, res) => {
		const { username, password, role } = req.body;

		if (!username || typeof username !== "string") {
			res.status(400).json({ error: "Username is required" });
			return;
		}
		if (!password || typeof password !== "string") {
			res.status(400).json({ error: "Password is required" });
			return;
		}
		if (!role || !["admin", "operator", "viewer"].includes(role)) {
			res.status(400).json({
				error: "Role must be 'admin', 'operator', or 'viewer'",
			});
			return;
		}

		try {
			const passwordHash = await hashPassword(password);
			const user = createUser(username, passwordHash, role);

			// Audit log user creation
			insertAuditLog(
				req.user?.userId ?? null,
				"user:create",
				username,
				JSON.stringify({ username, role }),
				getIpAddress(req)
			);

			clearPrefix("users:");
			res.status(201).json(user);
		} catch (err: unknown) {
			const error = err as { code?: number; message?: string };
			if (error.code === 19 && error.message?.includes("UNIQUE constraint failed")) {
				res.status(409).json({ error: "Username already exists" });
			} else {
				res.status(500).json({ error: "Internal server error" });
			}
		}
	});

	app.put("/api/users/:id", authMiddleware, requireAdmin, async (req, res) => {
		const id = Number.parseInt(req.params.id as string);
		const { role, password } = req.body;

		if (Number.isNaN(id)) {
			res.status(400).json({ error: "Invalid user ID" });
			return;
		}

		const existing = getUserById(id);
		if (!existing) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		const updates: { role?: UserRole; passwordHash?: string } = {};

		if (role !== undefined) {
			if (!["admin", "operator", "viewer"].includes(role)) {
				res.status(400).json({
					error: "Role must be 'admin', 'operator', or 'viewer'",
				});
				return;
			}
			if (existing.role === "admin" && role !== "admin") {
				const result = demoteAdminWithGuard(id, role);
				if (!result.success) {
					res.status(400).json({ error: result.error });
					return;
				}
			} else {
				updates.role = role;
			}
		}

		if (password !== undefined) {
			if (typeof password !== "string" || password.length === 0) {
				res.status(400).json({
					error: "Password must be a non-empty string",
				});
				return;
			}
			updates.passwordHash = await hashPassword(password);
		}

		updateUser(id, updates);

		// Audit log user update
		insertAuditLog(
			req.user?.userId ?? null,
			"user:update",
			existing.username,
			JSON.stringify({
				username: existing.username,
				role,
				passwordChanged: password !== undefined,
			}),
			getIpAddress(req)
		);

		clearPrefix("users:");
		res.json(getUserById(id));
	});

	app.delete("/api/users/:id", authMiddleware, requireAdmin, (req, res) => {
		const id = Number.parseInt(req.params.id as string);

		if (Number.isNaN(id)) {
			res.status(400).json({ error: "Invalid user ID" });
			return;
		}

		const existing = getUserById(id);
		if (!existing) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		if (existing.role === "admin") {
			const result = deleteUserWithAdminGuard(id);
			if (!result.success) {
				res.status(400).json({ error: result.error });
				return;
			}

			// Audit log admin user deletion
			insertAuditLog(
				req.user?.userId ?? null,
				"user:delete",
				existing.username,
				JSON.stringify({ username: existing.username, role: existing.role }),
				getIpAddress(req)
			);

			clearPrefix("users:");
			res.json({ success: true });
			return;
		}

		deleteUser(id);

		// Audit log user deletion
		insertAuditLog(
			req.user?.userId ?? null,
			"user:delete",
			existing.username,
			JSON.stringify({ username: existing.username, role: existing.role }),
			getIpAddress(req)
		);

		clearPrefix("users:");
		res.json({ success: true });
	});
}
