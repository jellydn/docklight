import { describe, expect, it } from "vitest";
import { assertValidConfigKey, validateConfigKey } from "./env-config-key.js";

describe("validateConfigKey", () => {
	it("accepts valid env var names", () => {
		expect(validateConfigKey("SUPER_ADMIN_BOOTSTRAP_EMAIL")).toBeNull();
		expect(validateConfigKey("NODE_ENV")).toBeNull();
	});

	it("rejects injection attempts", () => {
		expect(validateConfigKey("KEY;rm -rf /")).not.toBeNull();
		expect(validateConfigKey("'KEY'")).not.toBeNull();
		expect(validateConfigKey("")).not.toBeNull();
	});
});

describe("assertValidConfigKey", () => {
	it("throws for invalid keys", () => {
		expect(() => assertValidConfigKey("bad key")).toThrow(/Invalid characters/);
	});
});