import { test, expect } from "@playwright/test";
import { mockAuthMe, MOCK_PLUGINS } from "./helpers.js";

test.describe("Plugins", () => {
	test.beforeEach(async ({ page }) => {
		await mockAuthMe(page);
	});

	test("should display list of installed plugins", async ({ page }) => {
		await page.route("**/api/plugins", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_PLUGINS),
			});
		});

		await page.goto("/plugins");

		await expect(page.getByText("Plugins")).toBeVisible();
		await expect(page.getByText("postgres")).toBeVisible();
		await expect(page.getByText("redis")).toBeVisible();
	});

	test("should show empty state with install instructions when no plugins", async ({ page }) => {
		await page.route("**/api/plugins", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([]),
			});
		});

		await page.goto("/plugins");

		await expect(page.getByText("No plugins found")).toBeVisible();
		await expect(page.getByText("How to install plugins")).toBeVisible();
	});

	test("should display plugin status", async ({ page }) => {
		await page.route("**/api/plugins", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_PLUGINS),
			});
		});

		await page.goto("/plugins");

		await expect(page.getByText(/Status: Enabled/).first()).toBeVisible();
	});

	test("should display plugin version", async ({ page }) => {
		await page.route("**/api/plugins", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_PLUGINS),
			});
		});

		await page.goto("/plugins");

		await expect(page.getByText(/v1\.0\.0/)).toBeVisible();
		await expect(page.getByText(/v2\.0\.0/)).toBeVisible();
	});
});
