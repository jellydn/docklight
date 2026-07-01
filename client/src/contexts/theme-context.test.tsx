import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./theme-context.js";
import { THEME_STORAGE_KEY } from "@/lib/theme.js";

function ThemeProbe() {
	const { theme, toggleTheme } = useTheme();
	return (
		<div>
			<span data-testid="theme">{theme}</span>
			<button type="button" onClick={toggleTheme}>
				Toggle
			</button>
		</div>
	);
}

describe("ThemeProvider", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
	});

	afterEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
	});

	it("does not persist theme to localStorage on initial mount", () => {
		render(
			<ThemeProvider>
				<ThemeProbe />
			</ThemeProvider>
		);

		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
	});

	it("persists theme after the user toggles it", async () => {
		const user = userEvent.setup();
		render(
			<ThemeProvider>
				<ThemeProbe />
			</ThemeProvider>
		);

		await user.click(screen.getByRole("button", { name: "Toggle" }));

		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeTruthy();
	});
});
