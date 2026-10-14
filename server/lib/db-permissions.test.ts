import fs from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./port-conflicts.js", () => ({ getPortConflicts: vi.fn() }));

const TEST_DB_PATH = path.join(__dirname, "test-data", "permissions-test.db");

describe("app permission persistence", () => {
	beforeEach(() => {
		fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
		for (const suffix of ["", "-shm", "-wal"]) {
			if (fs.existsSync(`${TEST_DB_PATH}${suffix}`)) fs.unlinkSync(`${TEST_DB_PATH}${suffix}`);
		}
		vi.stubEnv("DOCKLIGHT_DB_PATH", TEST_DB_PATH);
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it("filters cached port conflicts after a read grant is revoked", async () => {
		const { createUser, replaceUserPermissions } = await import("./db.js");
		const { generateToken } = await import("./auth.js");
		const { getPortConflicts } = await import("./port-conflicts.js");
		const { registerAppPortRoutes } = await import("../routes/app-ports.js");
		const { clearPrefix } = await import("./cache.js");
		clearPrefix("apps:");
		const user = createUser("viewer", "hash", "viewer");
		vi.mocked(getPortConflicts).mockResolvedValue({
			conflicts: [{ scheme: "http", hostPort: 8080, apps: ["public", "secret"] }],
		});
		const app = express();
		app.use(cookieParser());
		registerAppPortRoutes(app);
		const cookie = `session=${generateToken(user)}`;
		const before = await request(app).get("/api/apps/port-conflicts").set("Cookie", cookie);
		expect(before.body.conflicts[0].apps).toEqual(["public", "secret"]);
		replaceUserPermissions(user.id, [
			{ resource: "apps", action: "read", scope: "secret", effect: "deny" },
		]);
		const after = await request(app).get("/api/apps/port-conflicts").set("Cookie", cookie);
		expect(after.body.conflicts).toEqual([{ scheme: "http", hostPort: 8080, apps: ["public"] }]);
	});

	it("prefers a scoped rule and replaces the complete app policy atomically", async () => {
		const { createUser, findAppPermission, getAppPermissions, replaceUserPermissions } =
			await import("./db.js");
		const user = createUser("alice", "hash", "operator");

		replaceUserPermissions(user.id, [
			{ resource: "apps", action: "delete", effect: "deny", scope: null },
			{ resource: "apps", action: "delete", effect: "allow", scope: "staging" },
		]);

		expect(findAppPermission(user.id, "delete", "staging")).toBe("allow");
		expect(findAppPermission(user.id, "delete", "production")).toBe("deny");
		expect(findAppPermission(user.id, "update", "staging")).toBeNull();

		replaceUserPermissions(user.id, [
			{ resource: "apps", action: "read", effect: "deny", scope: "secret" },
		]);
		expect(getAppPermissions(user.id)).toEqual([
			expect.objectContaining({ action: "read", effect: "deny", scope: "secret" }),
		]);
	});

	it("enforces complete resource policies through HTTP, including streams and delegated users", async () => {
		const {
			createUser,
			replaceUserPermissions,
			getUserPermissions,
			getUserById,
			getUserAuditLogs,
		} = await import("./db.js");
		const { generateToken } = await import("./auth.js");
		const { registerUserRoutes } = await import("../routes/users.js");
		const { registerDatabaseRoutes } = await import("../routes/databases.js");
		const { registerPluginRoutes } = await import("../routes/plugins.js");
		const { registerSettingsRoutes } = await import("../routes/settings.js");
		const { registerCommandRoutes } = await import("../routes/commands.js");
		const cache = await import("./cache.js");
		const admin = createUser("admin", "hash", "admin");
		const operator = createUser("operator", "hash", "operator");
		const viewer = createUser("viewer", "hash", "viewer");
		const app = express();
		const cookieParser = (await import("cookie-parser")).default;
		app.use(express.json());
		app.use(cookieParser());
		registerUserRoutes(app);
		registerDatabaseRoutes(app);
		registerPluginRoutes(app);
		registerSettingsRoutes(app);
		registerCommandRoutes(app);
		const session = (user: typeof admin): string => `session=${generateToken(user)}`;
		const policy = [
			{ resource: "databases", action: "read", effect: "deny", scope: null },
			{ resource: "databases", action: "read", effect: "allow", scope: "public" },
			{ resource: "databases", action: "update", effect: "deny", scope: null },
			{ resource: "databases", action: "delete", effect: "deny", scope: null },
			{ resource: "apps", action: "update", effect: "deny", scope: "production" },
			{ resource: "plugins", action: "read", effect: "deny", scope: null },
			{ resource: "plugins", action: "read", effect: "allow", scope: "postgres" },
			{ resource: "config", action: "read", effect: "allow", scope: null },
			{ resource: "users", action: "read", effect: "allow", scope: "viewer" },
			{ resource: "users", action: "update", effect: "allow", scope: null },
			{ resource: "users", action: "create", effect: "allow", scope: null },
			{ resource: "users", action: "delete", effect: "allow", scope: null },
		];
		const saved = await request(app)
			.put(`/api/users/${operator.id}/permissions`)
			.set("Cookie", session(admin))
			.send({ permissions: policy });
		expect(saved.status).toBe(200);
		expect(saved.body).toHaveLength(policy.length);
		cache.set("commands:recent:20", [{ command: "dokku apps:list", stdout: "private-app" }]);
		for (const endpoint of ["/api/commands", "/api/audit/logs"]) {
			expect((await request(app).get(endpoint).set("Cookie", session(operator))).status).toBe(403);
			expect((await request(app).get(endpoint).set("Cookie", session(admin))).status).toBe(200);
			expect((await request(app).get(endpoint).set("Cookie", session(viewer))).status).toBe(200);
		}
		expect(
			getUserAuditLogs().logs.some((entry) => entry.action === "user:permissions:update")
		).toBe(true);
		cache.set(
			"databases:list",
			["public", "private"].map((name) => ({
				name,
				plugin: "postgres",
				linkedApps: [],
				connectionInfo: "private-url",
			}))
		);
		cache.set("plugins:list", [
			{ name: "postgres", enabled: true },
			{ name: "redis", enabled: true },
		]);
		const databases = await request(app).get("/api/databases").set("Cookie", session(operator));
		expect(databases.body).toEqual([{ name: "public", plugin: "postgres", linkedApps: [] }]);
		expect((await request(app).get("/api/plugins").set("Cookie", session(operator))).body).toEqual([
			{ name: "postgres", enabled: true },
		]);
		expect((await request(app).get("/api/settings").set("Cookie", session(operator))).status).toBe(
			200
		);
		expect(
			(
				await request(app)
					.put("/api/settings")
					.set("Cookie", session(operator))
					.send({ logLevel: "debug" })
			).status
		).toBe(403);
		expect(
			(await request(app).get("/api/users").set("Cookie", session(operator))).body.map(
				(user: { username: string }) => user.username
			)
		).toEqual(["viewer"]);
		expect(
			(
				await request(app)
					.put(`/api/users/${viewer.id}`)
					.set("Cookie", session(operator))
					.send({ email: "viewer@example.invalid" })
			).status
		).toBe(200);
		expect(getUserById(viewer.id)?.email).toBe("viewer@example.invalid");
		expect(
			(
				await request(app)
					.put(`/api/users/${viewer.id}`)
					.set("Cookie", session(operator))
					.send({ role: "admin" })
			).status
		).toBe(403);
		expect(
			(
				await request(app)
					.put(`/api/users/${admin.id}`)
					.set("Cookie", session(operator))
					.send({ email: "attack@example.invalid" })
			).status
		).toBe(403);
		expect(
			(await request(app).delete(`/api/users/${admin.id}`).set("Cookie", session(operator))).status
		).toBe(403);
		expect(
			(
				await request(app)
					.post("/api/users")
					.set("Cookie", session(operator))
					.send({ username: "evil", password: "test", role: "admin" })
			).status
		).toBe(403);
		for (const accept of ["application/json", "text/event-stream"]) {
			expect(
				(
					await request(app)
						.delete("/api/databases/public")
						.set("Cookie", session(operator))
						.set("Accept", accept)
						.send({ plugin: "postgres" })
				).status
			).toBe(403);
			expect(
				(
					await request(app)
						.post("/api/databases/public/link")
						.set("Cookie", session(operator))
						.set("Accept", accept)
						.send({ plugin: "postgres", app: "production" })
				).status
			).toBe(403);
		}
		replaceUserPermissions(operator.id, [
			{ resource: "databases", action: "update", effect: "allow", scope: "public" },
			{ resource: "apps", action: "update", effect: "deny", scope: "production" },
		]);
		for (const accept of ["application/json", "text/event-stream"]) {
			expect(
				(
					await request(app)
						.post("/api/databases/public/link")
						.set("Cookie", session(operator))
						.set("Accept", accept)
						.send({ plugin: "postgres", app: "production" })
				).status
			).toBe(403);
		}
		const invalid = await request(app)
			.put(`/api/users/${operator.id}/permissions`)
			.set("Cookie", session(admin))
			.send({ permissions: [{ resource: "root", action: "read", effect: "allow" }] });
		expect(invalid.status).toBe(400);
		expect(getUserPermissions(operator.id)).toHaveLength(2);
		cache.clear();
	});
});
