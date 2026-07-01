import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	applyTheme,
	getStoredTheme,
	getSystemTheme,
	persistTheme,
	resolveTheme,
	THEME_STORAGE_KEY,
} from "./theme.js";

describe("theme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		document.documentElement.style.colorScheme = "";
	});

	afterEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		document.documentElement.style.colorScheme = "";
	});

	it("returns null when no theme is stored", () => {
		expect(getStoredTheme()).toBeNull();
	});

	it("reads stored theme from localStorage", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "dark");
		expect(getStoredTheme()).toBe("dark");
	});

	it("resolves system theme when nothing is stored", () => {
		const expected = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		expect(resolveTheme(null)).toBe(expected);
	});

	it("prefers stored theme over system theme", () => {
		expect(resolveTheme("light")).toBe("light");
	});

	it("applies dark class and color-scheme", () => {
		applyTheme("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
		expect(document.documentElement.style.colorScheme).toBe("dark");
	});

	it("removes dark class for light theme", () => {
		applyTheme("dark");
		applyTheme("light");
		expect(document.documentElement.classList.contains("dark")).toBe(false);
		expect(document.documentElement.style.colorScheme).toBe("light");
	});

	it("persists theme to localStorage", () => {
		persistTheme("dark");
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
	});

	it("detects system theme from media query", () => {
		expect(["light", "dark"]).toContain(getSystemTheme());
	});
});
