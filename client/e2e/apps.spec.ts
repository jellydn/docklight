import { test, expect } from "@playwright/test";
import {
	mockAuthMe,
	mockApps,
	mockServerHealth,
	mockCommands,
	MOCK_APPS,
	MOCK_APP_DETAIL,
} from "./helpers.js";

test.describe("App lifecycle", () => {
	test.beforeEach(async ({ page }) => {
		await mockAuthMe(page);
		await mockServerHealth(page);
		await mockCommands(page);
	});

	test("should display list of apps", async ({ page }) => {
		await mockApps(page);

		await page.goto("/apps");

		await expect(page.getByRole("link", { name: "my-app" })).toBeVisible();
		await expect(page.getByRole("link", { name: "another-app" })).toBeVisible();
		await expect(page.getByText("running")).toBeVisible();
		await expect(page.getByText("stopped")).toBeVisible();
	});

	test("should show empty state when no apps", async ({ page }) => {
		await mockApps(page, []);

		await page.goto("/apps");

		await expect(page.getByText("No apps found")).toBeVisible();
		await expect(page.getByText("Create your first app")).toBeVisible();
	});

	test("should open create app dialog", async ({ page }) => {
		await mockApps(page, []);

		await page.goto("/apps");

		await page.getByRole("button", { name: "Create App" }).first().click();

		await expect(page.getByText("Create New App")).toBeVisible();
		await expect(page.getByPlaceholder("my-app")).toBeVisible();
	});

	test("should create a new app", async ({ page }) => {
		await mockApps(page, []);

		const newApp = {
			name: "new-app",
			status: "stopped",
			domains: [],
		};

		await page.route("**/api/apps", (route) => {
			if (route.request().method() === "POST") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true, name: "new-app" }),
				});
			} else {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([newApp]),
				});
			}
		});

		await page.goto("/apps");

		await page.getByRole("button", { name: "Create App" }).first().click();
		await page.getByPlaceholder("my-app").fill("new-app");

		// Click the "Create App" button inside the dialog (last one)
		await page.getByRole("button", { name: "Create App" }).last().click();

		await expect(page.getByText("App Created!")).toBeVisible();
	});

	test("should navigate to app detail", async ({ page }) => {
		await mockApps(page);

		await page.route("**/api/apps/my-app", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_APP_DETAIL),
			});
		});

		await page.goto("/apps");

		await page.getByRole("link", { name: "my-app" }).click();

		await expect(page).toHaveURL(/\/apps\/my-app/);
		await expect(page.getByRole("heading", { name: "my-app" })).toBeVisible();
	});

	test("should show stop button for running app", async ({ page }) => {
		await page.route("**/api/apps/my-app", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_APP_DETAIL),
			});
		});

		await page.goto("/apps/my-app");

		await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Restart" })).toBeVisible();
	});

	test("should show start button for stopped app", async ({ page }) => {
		await page.route("**/api/apps/my-app", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ...MOCK_APP_DETAIL, status: "stopped" }),
			});
		});

		await page.goto("/apps/my-app");

		await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Stop" })).not.toBeVisible();
	});

	test("should open confirm dialog on restart", async ({ page }) => {
		await page.route("**/api/apps/my-app", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_APP_DETAIL),
			});
		});

		await page.goto("/apps/my-app");

		await page.getByRole("button", { name: "Restart" }).click();

		await expect(page.getByText("Confirm Action")).toBeVisible();
		await expect(page.getByText(/restart my-app/i)).toBeVisible();
	});

	test("should restart an app successfully", async ({ page }) => {
		await page.route("**/api/apps/my-app", (route) => {
			if (route.request().method() === "GET") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_APP_DETAIL),
				});
			} else {
				route.continue();
			}
		});

		await page.route("**/api/apps/my-app/restart", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ exitCode: 0, stdout: "Restarting my-app", stderr: "", command: "" }),
			});
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Restart" }).click();
		await page.getByRole("button", { name: "Confirm" }).click();

		// Dialog should close after successful restart
		await expect(page.getByText("Confirm Action")).not.toBeVisible();
	});

	test("should open delete dialog", async ({ page }) => {
		await page.route("**/api/apps/my-app", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_APP_DETAIL),
			});
		});

		await page.goto("/apps/my-app");

		await page.getByRole("button", { name: "Delete App" }).click();

		await expect(page.getByRole("heading", { name: "Delete App" })).toBeVisible();
		await expect(page.getByText(/permanently deleted/i)).toBeVisible();
	});

	test("should delete an app successfully", async ({ page }) => {
		// Register general routes first (lower LIFO priority)
		await mockApps(page, []);

		// Register specific route last (higher LIFO priority) so it takes precedence
		await page.route("**/api/apps/my-app", (route) => {
			if (route.request().method() === "GET") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_APP_DETAIL),
				});
			} else if (route.request().method() === "DELETE") {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ exitCode: 0, stdout: "Deleted my-app", stderr: "", command: "" }),
				});
			} else {
				route.continue();
			}
		});

		await page.goto("/apps/my-app");

		await page.getByRole("button", { name: "Delete App" }).click();

		// Type app name to confirm deletion
		await page.getByPlaceholder("Enter app name").fill("my-app");
		// The confirm button is first in DOM (dialog rendered before AppOverview)
		const deleteConfirmButton = page.getByRole("button", { name: "Delete App" }).first();
		await expect(deleteConfirmButton).not.toBeDisabled();
		// Dispatch click directly on the element: the button is inside a `fixed inset-0`
		// overlay div, so position-based clicks (including force:true) are intercepted
		// by the overlay. dispatchEvent bypasses position checks and fires on the element.
		await deleteConfirmButton.dispatchEvent("click");

		// Should navigate away after deletion
		await expect(page).toHaveURL(/\/apps$/);
	});
});
