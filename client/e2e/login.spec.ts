import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
	test("should render login form with username and password fields", async ({ page }) => {
		// Mock auth check as unauthenticated
		await page.route("**/api/auth/me", (route) => {
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: "Unauthorized" }),
			});
		});

		await page.goto("/login");

		await expect(page.getByText("Docklight Login")).toBeVisible();
		await expect(page.getByLabel("Username")).toBeVisible();
		await expect(page.getByLabel("Password")).toBeVisible();
		await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
	});

	test("should show error message on invalid credentials", async ({ page }) => {
		await page.route("**/api/auth/me", (route) => {
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: "Unauthorized" }),
			});
		});

		await page.route("**/api/auth/login", (route) => {
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: "Invalid credentials" }),
			});
		});

		await page.goto("/login");
		await page.getByLabel("Username").fill("admin");
		await page.getByLabel("Password").fill("wrong-password");
		await page.getByRole("button", { name: "Login" }).click();

		await expect(page.getByText("Invalid credentials")).toBeVisible();
	});

	test("should redirect to dashboard on successful login", async ({ page }) => {
		let loggedIn = false;

		// Dynamically handle auth/me based on login state
		await page.route("**/api/auth/me", (route) => {
			if (loggedIn) {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						authenticated: true,
						user: { id: 1, username: "admin", role: "admin" },
					}),
				});
			} else {
				route.fulfill({
					status: 401,
					contentType: "application/json",
					body: JSON.stringify({ error: "Unauthorized" }),
				});
			}
		});

		await page.route("**/api/auth/login", (route) => {
			loggedIn = true;
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ success: true }),
			});
		});

		await page.route("**/api/server/health", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ cpu: 10, memory: 20, disk: 30 }),
			});
		});

		await page.route("**/api/apps", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.route("**/api/commands*", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/login");
		await expect(page.getByText("Docklight Login")).toBeVisible();

		await page.getByLabel("Username").fill("admin");
		await page.getByLabel("Password").fill("correct-password");
		await page.getByRole("button", { name: "Login" }).click();

		await expect(page).toHaveURL(/\/dashboard/);
		await expect(page.getByText("Dashboard")).toBeVisible();
	});

	test("should show rate limit error message", async ({ page }) => {
		await page.route("**/api/auth/me", (route) => {
			route.fulfill({
				status: 401,
				contentType: "application/json",
				body: JSON.stringify({ error: "Unauthorized" }),
			});
		});

		await page.route("**/api/auth/login", (route) => {
			route.fulfill({
				status: 429,
				contentType: "application/json",
				body: JSON.stringify({ error: "Too many login attempts. Please try again later." }),
			});
		});

		await page.goto("/login");
		await page.getByLabel("Username").fill("admin");
		await page.getByLabel("Password").fill("any-password");
		await page.getByRole("button", { name: "Login" }).click();

		await expect(page.getByText(/Too many login attempts/)).toBeVisible();
	});
});
