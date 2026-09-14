import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
