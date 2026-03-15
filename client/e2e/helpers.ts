import type { Page } from "@playwright/test";
import { mockJsonEndpoint, fulfillJson } from "./route-utils.js";

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
	canScale: true,
};

export const MOCK_PLUGINS = [
	{ name: "postgres", enabled: true, version: "1.0.0" },
	{ name: "redis", enabled: true, version: "2.0.0" },
];

export async function mockAuthMe(page: Page): Promise<void> {
	await mockJsonEndpoint(
		page,
		"**/api/auth/me",
		{ authenticated: true, user: MOCK_USER },
	);
}

export async function mockAuthMeUnauthorized(page: Page): Promise<void> {
	await mockJsonEndpoint(page, "**/api/auth/me", { error: "Unauthorized" }, 401);
}

export async function mockApps(page: Page, apps = MOCK_APPS): Promise<void> {
	await page.route("**/api/apps", (route) => {
		if (route.request().method() === "GET") {
			fulfillJson(route, apps);
		} else {
			route.continue();
		}
	});
}

export async function mockServerHealth(page: Page): Promise<void> {
	await mockJsonEndpoint(page, "**/api/server/health", {
		cpu: 45.5,
		memory: 62.3,
		disk: 78.9,
	});
}

export async function mockCommands(page: Page): Promise<void> {
	await mockJsonEndpoint(page, "**/api/commands*", []);
}
