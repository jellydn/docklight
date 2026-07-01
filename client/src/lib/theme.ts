export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "docklight-theme";

export function getSystemTheme(): Theme {
	if (typeof window === "undefined") {
		return "light";
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): Theme | null {
	if (typeof window === "undefined") {
		return null;
	}
	const stored = localStorage.getItem(THEME_STORAGE_KEY);
	if (stored === "light" || stored === "dark") {
		return stored;
	}
	return null;
}

export function resolveTheme(stored: Theme | null): Theme {
	return stored ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
	const root = document.documentElement;
	root.classList.toggle("dark", theme === "dark");
	root.style.colorScheme = theme;
}

export function persistTheme(theme: Theme): void {
	localStorage.setItem(THEME_STORAGE_KEY, theme);
}
