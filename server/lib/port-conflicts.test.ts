import { describe, expect, it } from "vitest";
import {
	appHasHttpOnPort80,
	conflictsForApp,
	detectPortConflictsFromMappings,
} from "./port-conflicts.js";

describe("detectPortConflictsFromMappings", () => {
	it("returns empty when no apps share a host port", () => {
		const result = detectPortConflictsFromMappings({
			docklight: [{ scheme: "http", hostPort: 80, containerPort: 3001 }],
			other: [{ scheme: "http", hostPort: 8008, containerPort: 3000 }],
		});
		expect(result).toEqual([]);
	});

	it("detects two apps on the same http host port", () => {
		const result = detectPortConflictsFromMappings({
			docklight: [{ scheme: "http", hostPort: 80, containerPort: 3001 }],
			"ai-flow-staging": [{ scheme: "http", hostPort: 80, containerPort: 3000 }],
		});
		expect(result).toEqual([
			{
				scheme: "http",
				hostPort: 80,
				apps: ["ai-flow-staging", "docklight"],
			},
		]);
	});

	it("does not treat different schemes on same numeric port as one conflict bucket", () => {
		const result = detectPortConflictsFromMappings({
			a: [
				{ scheme: "http", hostPort: 443, containerPort: 3000 },
				{ scheme: "https", hostPort: 443, containerPort: 3000 },
			],
			b: [{ scheme: "http", hostPort: 443, containerPort: 3001 }],
		});
		expect(result).toEqual([{ scheme: "http", hostPort: 443, apps: ["a", "b"] }]);
	});
});

describe("conflictsForApp", () => {
	it("filters conflicts involving the app", () => {
		const conflicts = [
			{ scheme: "http", hostPort: 80, apps: ["docklight", "ai-flow-staging"] },
			{ scheme: "http", hostPort: 8008, apps: ["other", "another"] },
		];
		expect(conflictsForApp(conflicts, "docklight")).toEqual([conflicts[0]]);
	});
});

describe("appHasHttpOnPort80", () => {
	it("returns true when http maps to host 80", () => {
		expect(
			appHasHttpOnPort80([{ scheme: "http", hostPort: 80, containerPort: 3001 }])
		).toBe(true);
	});

	it("returns false when http uses a high port", () => {
		expect(
			appHasHttpOnPort80([{ scheme: "http", hostPort: 8008, containerPort: 3001 }])
		).toBe(false);
	});
});