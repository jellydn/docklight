import { test, expect } from "@playwright/test";
import {
	mockAuthMe,
	mockApps,
	mockServerHealth,
	mockCommands,
	MOCK_APP_DETAIL,
} from "./helpers.js";
import { mockJsonEndpoint, mockMethodRoute } from "./route-utils.js";

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
		const newApp = {
			name: "new-app",
			status: "stopped",
			domains: [],
		};

		await mockJsonEndpoint(page, "**/api/apps", {
			POST: { success: true, name: "new-app" },
			GET: [newApp],
		});

		await page.goto("/apps");

		await page.getByRole("button", { name: "Create App" }).first().click();
		await page.getByPlaceholder("my-app").fill("new-app");

		await page.getByRole("button", { name: "Create App" }).last().click();

		await expect(page.getByText("App Created!")).toBeVisible();
	});

	test("should navigate to app detail", async ({ page }) => {
		await mockApps(page);
		await mockJsonEndpoint(page, "**/api/apps/my-app", MOCK_APP_DETAIL);

		await page.goto("/apps");

		await page.getByRole("link", { name: "my-app" }).click();

		await expect(page).toHaveURL(/\/apps\/my-app/);
		await expect(page.getByRole("heading", { name: "my-app" })).toBeVisible();
	});

	test("should show stop button for running app", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/apps/my-app", MOCK_APP_DETAIL);

		await page.goto("/apps/my-app");

		await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Restart" })).toBeVisible();
	});

	test("should show start button for stopped app", async ({ page }) => {
		await mockJsonEndpoint(
			page,
			"**/api/apps/my-app",
			{ ...MOCK_APP_DETAIL, status: "stopped" },
		);

		await page.goto("/apps/my-app");

		await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Stop" })).not.toBeVisible();
	});

	test("should open confirm dialog on restart", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/apps/my-app", MOCK_APP_DETAIL);

		await page.goto("/apps/my-app");

		await page.getByRole("button", { name: "Restart" }).click();

		await expect(page.getByText("Confirm Action")).toBeVisible();
		await expect(page.getByText(/restart my-app/i)).toBeVisible();
	});

	test("should restart an app successfully", async ({ page }) => {
		await mockMethodRoute(page, "**/api/apps/my-app", "GET", MOCK_APP_DETAIL);
		await mockJsonEndpoint(page, "**/api/apps/my-app/restart", {
			exitCode: 0,
			stdout: "Restarting my-app",
			stderr: "",
			command: "",
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Restart" }).click();
		await page.getByRole("button", { name: "Confirm" }).click();

		await expect(page.getByText("Confirm Action")).not.toBeVisible();
	});

	test("should open delete dialog", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/apps/my-app", MOCK_APP_DETAIL);

		await page.goto("/apps/my-app");

		await page.getByRole("button", { name: "Delete App" }).click();

		await expect(page.getByRole("heading", { name: "Delete App" })).toBeVisible();
		await expect(page.getByText(/permanently deleted/i)).toBeVisible();
	});

	test("should delete an app successfully", async ({ page }) => {
		await mockApps(page, []);

		await mockJsonEndpoint(page, "**/api/apps/my-app", {
			GET: MOCK_APP_DETAIL,
			DELETE: { exitCode: 0, stdout: "Deleted my-app", stderr: "", command: "" },
		});

		await page.goto("/apps/my-app");

		await page.getByRole("button", { name: "Delete App" }).click();

		await page.getByPlaceholder("Enter app name").fill("my-app");
		const deleteConfirmButton = page.getByRole("button", { name: "Delete App" }).first();
		await expect(deleteConfirmButton).not.toBeDisabled();
		await deleteConfirmButton.dispatchEvent("click");

		await expect(page.getByText(/my-app.*deleted/i)).toBeVisible();

		await expect(page).toHaveURL(/\/apps$/);
	});
});
