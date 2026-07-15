import { describe, expect, it } from "vitest";
import { buildRoutingIssues } from "./routing-issues.js";

describe("buildRoutingIssues", () => {
	it("flags shared host port 80 between apps", () => {
		const issues = buildRoutingIssues(
			"docklight",
			[{ scheme: "http", hostPort: 80, containerPort: 3001 }],
			[{ scheme: "http", hostPort: 80, apps: ["docklight", "ai-flow-staging"] }]
		);
		expect(issues.some((i) => i.id.startsWith("conflict-http-80"))).toBe(true);
		expect(issues.some((i) => i.id === "ssl-http80-conflict")).toBe(true);
	});

	it("warns when http is not on port 80", () => {
		const issues = buildRoutingIssues(
			"docklight",
			[{ scheme: "http", hostPort: 8008, containerPort: 3001 }],
			[]
		);
		expect(issues.some((i) => i.id === "no-http-80")).toBe(true);
	});
});