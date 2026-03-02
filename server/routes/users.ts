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
} from "../lib/db.js";
import { authMiddleware, requireAdmin, hashPassword } from "../lib/auth.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { auditLog } from "./util.js";

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

			auditLog(req, "user:create", username, { username, role });

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

		auditLog(req, "user:update", existing.username, {
			username: existing.username,
			role,
			passwordChanged: password !== undefined,
		});

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
			auditLog(req, "user:delete", existing.username, {
				username: existing.username,
				role: existing.role,
			});

			clearPrefix("users:");
			res.json({ success: true });
			return;
		}

		deleteUser(id);

		auditLog(req, "user:delete", existing.username, {
			username: existing.username,
			role: existing.role,
		});

		clearPrefix("users:");
		res.json({ success: true });
	});
}
