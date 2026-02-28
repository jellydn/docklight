import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { get, set, del, clear, clearPrefix, getStats } from "./cache.js";

describe("cache", () => {
	beforeEach(() => {
		clear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("get and set", () => {
		it("should store and retrieve values", () => {
			set("key1", "value1");
			expect(get("key1")).toBe("value1");
		});

		it("should return undefined for non-existent keys", () => {
			expect(get("nonexistent")).toBeUndefined();
		});

		it("should store complex objects", () => {
			const obj = { foo: "bar", nested: { arr: [1, 2, 3] } };
			set("obj", obj);
			expect(get("obj")).toEqual(obj);
		});

		it("should overwrite existing keys", () => {
			set("key", "value1");
			set("key", "value2");
			expect(get("key")).toBe("value2");
		});
	});

	describe("TTL expiration", () => {
		it("should expire entries after TTL", () => {
			set("key", "value", 1000);
			expect(get("key")).toBe("value");

			vi.advanceTimersByTime(1001);
			expect(get("key")).toBeUndefined();
		});

		it("should use default CACHE_TTL when not specified", () => {
			const defaultTtl = Number.parseInt(process.env.CACHE_TTL ?? "30000", 10);
			set("key", "value");
			expect(get("key")).toBe("value");

			vi.advanceTimersByTime(defaultTtl + 1);
			expect(get("key")).toBeUndefined();
		});

		it("should handle custom TTL values", () => {
			set("short", "value", 100);
			set("long", "value", 5000);

			vi.advanceTimersByTime(101);
			expect(get("short")).toBeUndefined();
			expect(get("long")).toBe("value");
		});
	});

	describe("del", () => {
		it("should delete specific keys", () => {
			set("key1", "value1");
			set("key2", "value2");

			del("key1");

			expect(get("key1")).toBeUndefined();
			expect(get("key2")).toBe("value2");
		});

		it("should be idempotent", () => {
			expect(() => del("nonexistent")).not.toThrow();
		});
	});

	describe("clear", () => {
		it("should remove all entries", () => {
			set("key1", "value1");
			set("key2", "value2");
			set("key3", "value3");

			clear();

			expect(get("key1")).toBeUndefined();
			expect(get("key2")).toBeUndefined();
			expect(get("key3")).toBeUndefined();
		});

		it("should be idempotent", () => {
			expect(() => clear()).not.toThrow();
			expect(() => clear()).not.toThrow();
		});
	});

	describe("clearPrefix", () => {
		beforeEach(() => {
			set("apps:list", [{ name: "app1" }]);
			set("apps:detail:app1", { name: "app1", status: "running" });
			set("apps:detail:app2", { name: "app2", status: "stopped" });
			set("databases:list", [{ name: "db1" }]);
			set("other:key", "value");
		});

		it("should clear all keys with a prefix", () => {
			clearPrefix("apps:");

			expect(get("apps:list")).toBeUndefined();
			expect(get("apps:detail:app1")).toBeUndefined();
			expect(get("apps:detail:app2")).toBeUndefined();
			expect(get("databases:list")).toEqual([{ name: "db1" }]);
			expect(get("other:key")).toBe("value");
		});

		it("should clear only exact prefix matches", () => {
			clearPrefix("apps:detail:");

			expect(get("apps:list")).toEqual([{ name: "app1" }]);
			expect(get("apps:detail:app1")).toBeUndefined();
			expect(get("apps:detail:app2")).toBeUndefined();
			expect(get("databases:list")).toEqual([{ name: "db1" }]);
			expect(get("other:key")).toBe("value");
		});
	});

	describe("getStats", () => {
		it("should return cache statistics", () => {
			set("key1", "value1");
			set("key2", "value2");

			const stats = getStats();

			expect(stats.size).toBe(2);
			expect(stats.keys).toContain("key1");
			expect(stats.keys).toContain("key2");
		});

		it("should not count expired entries", () => {
			set("valid", "value", 1000);
			set("expired", "value", 500);

			vi.advanceTimersByTime(501);

			const stats = getStats();

			expect(stats.size).toBe(1);
			expect(stats.keys).toContain("valid");
			expect(stats.keys).not.toContain("expired");
		});

		it("should return empty stats for empty cache", () => {
			const stats = getStats();

			expect(stats.size).toBe(0);
			expect(stats.keys).toEqual([]);
		});
	});
});
