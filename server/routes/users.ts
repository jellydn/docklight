import type express from "express";
import {
	getAllUsers,
	createUser,
	getUserById,
	updateUserWithGuard,
	deleteUser,
	type UserRole,
	deleteUserWithAdminGuard,
	getUserPermissions,
	replaceUserPermissions,
	type Permission,
	type SafeUser,
} from "../lib/db.js";
import {
	authMiddleware,
	requireAdmin,
	hashPassword,
	canAccessResource,
	requireResourcePermission,
} from "../lib/auth.js";
import { clearPrefix, get, set } from "../lib/cache.js";
import { safeAuditLog, handleDbError } from "./util.js";

function userScope(req: express.Request): string | null {
	return getUserById(Number.parseInt(req.params.id as string))?.username ?? null;
}

export function registerUserRoutes(app: express.Application): void {
	app.get("/api/users", authMiddleware, (req, res) => {
		const cacheKey = "users:list";
		const users = (get(cacheKey) as SafeUser[] | null) ?? getAllUsers();
		set(cacheKey, users);
		res.json(
			users.filter((user) => canAccessResource(req.user, "users", "read", user.username, ["admin"]))
		);
	});

	app.post(
		"/api/users",
		authMiddleware,
		requireResourcePermission(
			"users",
			"create",
			(req) => (typeof req.body?.username === "string" ? req.body.username : null),
			["admin"]
		),
		async (req, res) => {
			const { username, password, role, email } = req.body;
			if (req.user?.role !== "admin" && role === "admin") {
				res.status(403).json({ error: "Only administrators can create administrators" });
				return;
			}

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

			if (email !== undefined && email !== null && typeof email !== "string") {
				res.status(400).json({ error: "Invalid email address" });
				return;
			}

			const normalizedEmail =
				typeof email === "string" && email.trim().length > 0 ? email.trim().toLowerCase() : null;
			if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
				res.status(400).json({ error: "Invalid email address" });
				return;
			}

			try {
				const passwordHash = await hashPassword(password);
				const user = createUser(username, passwordHash, role, normalizedEmail);

				safeAuditLog(req, "user:create", username, { username, role, emailSet: !!normalizedEmail });

				clearPrefix("users:");
				res.status(201).json(user);
			} catch (err: unknown) {
				handleDbError(err, res);
			}
		}
	);

	app.put(
		"/api/users/:id",
		authMiddleware,
		requireResourcePermission("users", "update", userScope, ["admin"]),
		async (req, res) => {
			const id = Number.parseInt(req.params.id as string);
			const { role, password, email } = req.body;

			if (Number.isNaN(id)) {
				res.status(400).json({ error: "Invalid user ID" });
				return;
			}

			const existing = getUserById(id);
			if (!existing) {
				res.status(404).json({ error: "User not found" });
				return;
			}
			if (req.user?.role !== "admin" && (existing.role === "admin" || role !== undefined)) {
				res
					.status(403)
					.json({ error: "Only administrators can change roles or administrator accounts" });
				return;
			}

			const updates: { role?: UserRole; passwordHash?: string; email?: string | null } = {};

			if (role !== undefined) {
				if (!["admin", "operator", "viewer"].includes(role)) {
					res.status(400).json({
						error: "Role must be 'admin', 'operator', or 'viewer'",
					});
					return;
				}
				updates.role = role;
			}

			if (email !== undefined) {
				if (email !== null && typeof email !== "string") {
					res.status(400).json({ error: "Invalid email address" });
					return;
				}
				const normalizedEmail =
					typeof email === "string" && email.trim().length > 0 ? email.trim().toLowerCase() : null;
				if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
					res.status(400).json({ error: "Invalid email address" });
					return;
				}
				updates.email = normalizedEmail;
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

			try {
				const result = updateUserWithGuard(id, updates);
				if (!result.success) {
					res.status(400).json({ error: result.error });
					return;
				}
			} catch (err: unknown) {
				handleDbError(err, res);
				return;
			}

			safeAuditLog(req, "user:update", existing.username, {
				username: existing.username,
				role,
				emailChanged: updates.email !== undefined,
				passwordChanged: password !== undefined,
			});

			clearPrefix("users:");
			res.json(getUserById(id));
		}
	);

	app.get("/api/users/:id/permissions", authMiddleware, requireAdmin, (req, res) => {
		const id = Number.parseInt(req.params.id as string);
		if (Number.isNaN(id)) {
			res.status(400).json({ error: "Invalid user ID" });
			return;
		}
		if (!getUserById(id)) {
			res.status(404).json({ error: "User not found" });
			return;
		}
		res.json(getUserPermissions(id));
	});

	app.put("/api/users/:id/permissions", authMiddleware, requireAdmin, (req, res) => {
		const id = Number.parseInt(req.params.id as string);
		if (Number.isNaN(id)) {
			res.status(400).json({ error: "Invalid user ID" });
			return;
		}
		const user = getUserById(id);
		if (!user) {
			res.status(404).json({ error: "User not found" });
			return;
		}

		const permissions = req.body?.permissions;
		if (!Array.isArray(permissions)) {
			res.status(400).json({ error: "Permissions must be an array" });
			return;
		}

		if (permissions.length > 200) {
			res.status(400).json({ error: "At most 200 permission rules are allowed" });
			return;
		}
		const normalized: Pick<Permission, "resource" | "action" | "scope" | "effect">[] = [];
		const unique = new Set<string>();
		for (const permission of permissions) {
			const resource = permission?.resource ?? "apps";
			if (
				!permission ||
				!["apps", "databases", "plugins", "config", "users"].includes(resource) ||
				!["create", "read", "update", "delete"].includes(permission.action) ||
				!["allow", "deny"].includes(permission.effect) ||
				(permission.scope !== null &&
					permission.scope !== undefined &&
					typeof permission.scope !== "string")
			) {
				res.status(400).json({ error: "Invalid permission" });
				return;
			}
			const scope = typeof permission.scope === "string" ? permission.scope.trim() || null : null;
			if (scope !== null && !/^[A-Za-z0-9._-]{1,100}$/.test(scope)) {
				res.status(400).json({ error: "Invalid permission scope" });
				return;
			}
			const key = JSON.stringify([resource, permission.action, scope]);
			if (unique.has(key)) {
				res.status(400).json({ error: "Duplicate permission" });
				return;
			}
			unique.add(key);
			normalized.push({
				resource,
				action: permission.action,
				effect: permission.effect,
				scope,
			});
		}

		const saved = replaceUserPermissions(id, normalized);
		safeAuditLog(req, "user:permissions:update", user.username, {
			permissions: normalized,
		});
		res.json(saved);
	});

	app.delete(
		"/api/users/:id",
		authMiddleware,
		requireResourcePermission("users", "delete", userScope, ["admin"]),
		(req, res) => {
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
				if (req.user?.role !== "admin") {
					res.status(403).json({ error: "Only administrators can delete administrators" });
					return;
				}
				const result = deleteUserWithAdminGuard(id);
				if (!result.success) {
					res.status(400).json({ error: result.error });
					return;
				}

				// Audit log admin user deletion
				safeAuditLog(req, "user:delete", existing.username, {
					username: existing.username,
					role: existing.role,
				});

				clearPrefix("users:");
				res.json({ success: true });
				return;
			}

			deleteUser(id);

			safeAuditLog(req, "user:delete", existing.username, {
				username: existing.username,
				role: existing.role,
			});

			clearPrefix("users:");
			res.json({ success: true });
		}
	);
}
