import type { Page, Route } from "@playwright/test";

export const MOCK_USER = { id: 1, username: "admin", role: "admin" };

export const MOCK_APPS = [
	{
		name: "my-app",
		status: "running",
		domains: ["my-app.example.com"],
		lastDeployTime: "2024-01-15T10:30:00Z",
	},
	{
		name: "another-app",
		status: "stopped",
		domains: [],
		lastDeployTime: undefined,
	},
];

export const MOCK_APP_DETAIL = {
	name: "my-app",
	status: "running",
	gitRemote: "dokku@my-app.example.com",
	domains: ["my-app.example.com"],
	processes: { web: 1 },
};

export const MOCK_PLUGINS = [
	{ name: "postgres", enabled: true, version: "1.0.0" },
	{ name: "redis", enabled: true, version: "2.0.0" },
];

/**
 * Mock the /api/auth/me endpoint as authenticated
 */
export async function mockAuthMe(page: Page): Promise<void> {
	await page.route("**/api/auth/me", (route: Route) => {
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ authenticated: true, user: MOCK_USER }),
		});
	});
}

/**
 * Mock the /api/auth/me endpoint as unauthenticated
 */
export async function mockAuthMeUnauthorized(page: Page): Promise<void> {
	await page.route("**/api/auth/me", (route: Route) => {
		route.fulfill({
			status: 401,
			contentType: "application/json",
			body: JSON.stringify({ error: "Unauthorized" }),
		});
	});
}

/**
 * Mock the /api/apps endpoint
 */
export async function mockApps(page: Page, apps = MOCK_APPS): Promise<void> {
	await page.route("**/api/apps", (route: Route) => {
		if (route.request().method() === "GET") {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(apps),
			});
		} else {
			route.continue();
		}
	});
}

/**
 * Mock the /api/server/health endpoint
 */
export async function mockServerHealth(page: Page): Promise<void> {
	await page.route("**/api/server/health", (route: Route) => {
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ cpu: 45.5, memory: 62.3, disk: 78.9 }),
		});
	});
}

/**
 * Mock the /api/commands endpoint
 */
export async function mockCommands(page: Page): Promise<void> {
	await page.route("**/api/commands*", (route: Route) => {
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});
}
