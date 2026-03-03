import { test, expect } from "@playwright/test";
import { mockAuthMe, MOCK_APP_DETAIL } from "./helpers.js";
import { mockJsonEndpoint, createStatefulMock } from "./route-utils.js";

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
		await mockJsonEndpoint(page, "**/api/apps/my-app", MOCK_APP_WITH_CONFIG);
	});

	test("should display environment variables tab", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/apps/my-app/config", MOCK_CONFIG_VARS);

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(
			page.getByRole("heading", { name: "Environment Variables" }),
		).toBeVisible();
		await expect(page.getByText("DATABASE_URL")).toBeVisible();
		await expect(page.getByText("SECRET_KEY")).toBeVisible();
	});

	test("should show masked values by default", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/apps/my-app/config", MOCK_CONFIG_VARS);

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(
			page.getByRole("heading", { name: "Environment Variables" }),
		).toBeVisible();
		const maskedValues = page.getByText("••••••");
		await expect(maskedValues.first()).toBeVisible();
	});

	test("should add a new environment variable", async ({ page }) => {
		const configMock = createStatefulMock(
			{ ...MOCK_CONFIG_VARS },
			(config, request) => {
				if (request.method() === "POST") {
					return {
						data: {
							exitCode: 0,
							stdout: "Setting config vars: NEW_KEY",
							stderr: "",
							command: "",
						},
						status: 200,
						nextState: { ...config, NEW_KEY: "new-value" },
					};
				}
				return { data: config, status: 200 };
			},
		);

		await page.route("**/api/apps/my-app/config", configMock.handler);

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(
			page.getByRole("heading", { name: "Environment Variables" }),
		).toBeVisible();

		await page.getByPlaceholder("Key").fill("NEW_KEY");
		await page.getByPlaceholder("Value").fill("new-value");
		await page.getByRole("button", { name: "Set", exact: true }).click();

		await expect(
			page.getByRole("heading", { name: "Environment Variables" }),
		).toBeVisible();
	});

	test("should show empty state when no env vars configured", async ({ page }) => {
		await mockJsonEndpoint(page, "**/api/apps/my-app/config", {});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(
			page.getByText("No environment variables configured."),
		).toBeVisible();
	});

	test("should remove an environment variable", async ({ page }) => {
		const configMock = createStatefulMock(
			{ ...MOCK_CONFIG_VARS },
			(config, request) => {
				if (request.method() === "GET") {
					return { data: config, status: 200 };
				}
				return { data: null, status: 0 };
			},
		);

		await page.route("**/api/apps/my-app/config", configMock.handler);

		const deleteVarMock = createStatefulMock(
			{ ...MOCK_CONFIG_VARS },
			(config, request) => {
				if (request.method() === "DELETE") {
					const { DATABASE_URL: _, ...rest } = config;
					return {
						data: {
							exitCode: 0,
							stdout: "Unsetting config vars: DATABASE_URL",
							stderr: "",
							command: "",
						},
						status: 200,
						nextState: rest,
					};
				}
				return { data: null, status: 0 };
			},
		);

		await page.route("**/api/apps/my-app/config/DATABASE_URL", async (route) => {
			if (route.request().method() === "DELETE") {
				await deleteVarMock.handler(route);
			} else {
				route.continue();
			}
		});

		await page.goto("/apps/my-app");
		await page.getByRole("button", { name: "Config" }).click();

		await expect(page.getByText("DATABASE_URL")).toBeVisible();

		const dbUrlRow = page.getByText("DATABASE_URL").locator("..").locator("..");
		await dbUrlRow.getByTitle("Remove").click();

		await expect(
			page.getByRole("heading", { name: "Environment Variables" }),
		).toBeVisible();
	});
});
