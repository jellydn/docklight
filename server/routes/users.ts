import type express from "express";
import {
	getAllUsers,
	createUser,
	getUserById,
	updateUser,
	deleteUser,
	getAdminCount,
	type UserRole,
} from "../lib/db.js";
import { authMiddleware, requireAdmin, hashPassword } from "../lib/auth.js";

export function registerUserRoutes(app: express.Application): void {
	app.get("/api/users", authMiddleware, requireAdmin, (_req, res) => {
		const users = getAllUsers();
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
			res.status(201).json(user);
		} catch (_err) {
			res.status(409).json({ error: "Username already exists" });
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
				if (getAdminCount() <= 1) {
					res.status(400).json({
						error: "Cannot demote the last admin user",
					});
					return;
				}
			}
			updates.role = role;
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

		if (existing.role === "admin" && getAdminCount() <= 1) {
			res.status(400).json({ error: "Cannot delete the last admin user" });
			return;
		}

		deleteUser(id);
		res.json({ success: true });
	});
}
