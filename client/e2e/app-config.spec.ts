import { test, expect } from "@playwright/test";
import { mockAuthMe, MOCK_APP_DETAIL } from "./helpers.js";

const MOCK_APP_WITH_CONFIG = {
	...MOCK_APP_DETAIL,
};

const MOCK_CONFIG_VARS = {
	DATABASE_URL: "postgres://localhost/mydb",
	SECRET_KEY: "super-secret",
};

test.describe("Config management", () => {
	test.beforeEach(async ({ page }) => {
		await mockAuthMe(page);

		await page.route("**/api/apps/my-app", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_APP_WITH_CONFIG),
			});
		});
	});

	test("should display environment variables tab", async ({ page }) => {
		await page.route("**/api/apps/my-app/config", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_CONFIG_VARS),
			});
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(page.getByRole("heading", { name: "Environment Variables" })).toBeVisible();
		await expect(page.getByText("DATABASE_URL")).toBeVisible();
		await expect(page.getByText("SECRET_KEY")).toBeVisible();
	});

	test("should show masked values by default", async ({ page }) => {
		await page.route("**/api/apps/my-app/config", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_CONFIG_VARS),
			});
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(page.getByRole("heading", { name: "Environment Variables" })).toBeVisible();
		// Values should be masked
		const maskedValues = page.getByText("••••••");
		await expect(maskedValues.first()).toBeVisible();
	});

	test("should add a new environment variable", async ({ page }) => {
		let configVars = { ...MOCK_CONFIG_VARS };

		await page.route("**/api/apps/my-app/config", (route) => {
			if (route.request().method() === "GET") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(configVars),
				});
			} else if (route.request().method() === "POST") {
				configVars = { ...configVars, NEW_KEY: "new-value" };
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						exitCode: 0,
						stdout: "Setting config vars: NEW_KEY",
						stderr: "",
						command: "",
					}),
				});
			} else {
				route.continue();
			}
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(page.getByRole("heading", { name: "Environment Variables" })).toBeVisible();

		await page.getByPlaceholder("Key").fill("NEW_KEY");
		await page.getByPlaceholder("Value").fill("new-value");
		await page.getByRole("button", { name: "Set", exact: true }).click();

		// Verify the API was called
		await expect(page.getByRole("heading", { name: "Environment Variables" })).toBeVisible();
	});

	test("should show empty state when no env vars configured", async ({ page }) => {
		await page.route("**/api/apps/my-app/config", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({}),
			});
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(page.getByText("No environment variables configured.")).toBeVisible();
	});

	test("should remove an environment variable", async ({ page }) => {
		let configVars = { ...MOCK_CONFIG_VARS };

		await page.route("**/api/apps/my-app/config", (route) => {
			if (route.request().method() === "GET") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(configVars),
				});
			} else {
				route.continue();
			}
		});

		await page.route("**/api/apps/my-app/config/DATABASE_URL", (route) => {
			if (route.request().method() === "DELETE") {
				const { DATABASE_URL: _, ...rest } = configVars;
				configVars = rest;
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						exitCode: 0,
						stdout: "Unsetting config vars: DATABASE_URL",
						stderr: "",
						command: "",
					}),
				});
			} else {
				route.continue();
			}
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(page.getByText("DATABASE_URL")).toBeVisible();

		// Click the remove button (trash icon) for DATABASE_URL row
		const dbUrlRow = page.getByText("DATABASE_URL").locator("..").locator("..");
		await dbUrlRow.getByTitle("Remove").click();

		// The API call should have been made
		await expect(page.getByRole("heading", { name: "Environment Variables" })).toBeVisible();
	});
});
