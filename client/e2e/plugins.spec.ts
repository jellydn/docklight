import { test, expect } from "@playwright/test";
import { mockAuthMe, MOCK_PLUGINS } from "./helpers.js";
import { mockJsonEndpoint } from "./route-utils.js";

test.describe("Plugins", () => {
	test.beforeEach(async ({ page }) => {
		await mockAuthMe(page);
	});

	test("should display list of installed plugins", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/plugins", MOCK_PLUGINS);

		await page.goto("/plugins");

		await expect(page.getByText("Plugins")).toBeVisible();
		await expect(page.getByText("postgres")).toBeVisible();
		await expect(page.getByText("redis")).toBeVisible();
	});

	test("should show empty state with install instructions when no plugins", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/plugins", []);

		await page.goto("/plugins");

		await expect(page.getByText("No plugins found")).toBeVisible();
		await expect(page.getByText("How to install plugins")).toBeVisible();
	});

	test("should display plugin status", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/plugins", MOCK_PLUGINS);

		await page.goto("/plugins");

		await expect(page.getByText(/Status: Enabled/).first()).toBeVisible();
	});

	test("should display plugin version", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/plugins", MOCK_PLUGINS);

		await page.goto("/plugins");

		await expect(page.getByText(/v1\.0\.0/)).toBeVisible();
		await expect(page.getByText(/v2\.0\.0/)).toBeVisible();
	});
});
