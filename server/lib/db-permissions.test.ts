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
		const { createUser, replaceAppPermissions } = await import("./db.js");
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
		replaceAppPermissions(user.id, [{ action: "read", scope: "secret", effect: "deny" }]);
		const after = await request(app).get("/api/apps/port-conflicts").set("Cookie", cookie);
		expect(after.body.conflicts).toEqual([{ scheme: "http", hostPort: 8080, apps: ["public"] }]);
	});

	it("prefers a scoped rule and replaces the complete app policy atomically", async () => {
		const { createUser, findAppPermission, getAppPermissions, replaceAppPermissions } =
			await import("./db.js");
		const user = createUser("alice", "hash", "operator");

		replaceAppPermissions(user.id, [
			{ action: "delete", effect: "deny", scope: null },
			{ action: "delete", effect: "allow", scope: "staging" },
		]);

		expect(findAppPermission(user.id, "delete", "staging")).toBe("allow");
		expect(findAppPermission(user.id, "delete", "production")).toBe("deny");
		expect(findAppPermission(user.id, "update", "staging")).toBeNull();

		replaceAppPermissions(user.id, [{ action: "read", effect: "deny", scope: "secret" }]);
		expect(getAppPermissions(user.id)).toEqual([
			expect.objectContaining({ action: "read", effect: "deny", scope: "secret" }),
		]);
	});
});
