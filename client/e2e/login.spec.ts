import { test, expect } from "@playwright/test";
import { mockJsonEndpoint, createStatefulMock } from "./route-utils.js";

test.describe("Login flow", () => {
	test("should render login form with username and password fields", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/auth/me", { error: "Unauthorized" }, 401);

		await page.goto("/login");

		await expect(page.getByText("Docklight Login")).toBeVisible();
		await expect(page.getByLabel("Username")).toBeVisible();
		await expect(page.getByLabel("Password")).toBeVisible();
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
	});

	test("should show error message on invalid credentials", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/auth/me", { error: "Unauthorized" }, 401);
		await mockJsonEndpoint(
			page,
			"**/api/auth/login",
			{ error: "Invalid credentials" },
			401,
		);

		await page.goto("/login");
		await page.getByLabel("Username").fill("admin");
		await page.getByLabel("Password").fill("wrong-password");
		await page.getByRole("button", { name: "Login" }).click();

		await expect(page.getByText("Invalid credentials")).toBeVisible();
	});

	test("should redirect to dashboard on successful login", async ({ page }) => {
		const authMock = createStatefulMock(false, (loggedIn, request) => {
			if (request.url().includes("/login")) {
				return { data: { success: true }, status: 200, nextState: true };
			}
			return {
				data: loggedIn
					? { authenticated: true, user: { id: 1, username: "admin", role: "admin" } }
					: { error: "Unauthorized" },
				status: loggedIn ? 200 : 401,
			};
		});

		await page.route("**/api/auth/me", authMock.handler);
		await page.route("**/api/auth/login", authMock.handler);
		await mockJsonEndpoint(page, "**/api/server/health", {
			cpu: 10,
			memory: 20,
			disk: 30,
		});
		await mockJsonEndpoint(page, "**/api/apps", []);
		await mockJsonEndpoint(page, "**/api/commands*", []);

		await page.goto("/login");
		await expect(page.getByText("Docklight Login")).toBeVisible();

		await page.getByLabel("Username").fill("admin");
		await page.getByLabel("Password").fill("correct-password");
		await page.getByRole("button", { name: "Login" }).click();

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByText("Dashboard")).toBeVisible();
	});

	test("should show rate limit error message", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/auth/me", { error: "Unauthorized" }, 401);
		await mockJsonEndpoint(
			page,
			"**/api/auth/login",
			{ error: "Too many login attempts. Please try again later." },
			429,
		);

		await page.goto("/login");
		await page.getByLabel("Username").fill("admin");
		await page.getByLabel("Password").fill("any-password");
		await page.getByRole("button", { name: "Login" }).click();

		await expect(page.getByText(/Too many login attempts/)).toBeVisible();
	});
});
