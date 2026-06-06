import { describe, expect, it } from "vitest";
import { buildServerHealth, getOverallStatus, getResourceStatus } from "./server.js";

describe("server health status", () => {
	it("should mark values below 70 as ok", () => {
		expect(getResourceStatus(12)).toBe("ok");
		expect(getResourceStatus(69.9)).toBe("ok");
	});

	it("should mark values from 70 to 89 as warning", () => {
		expect(getResourceStatus(70)).toBe("warning");
		expect(getResourceStatus(89.9)).toBe("warning");
	});

	it("should mark values at or above 90 as critical", () => {
		expect(getResourceStatus(90)).toBe("critical");
		expect(getResourceStatus(97)).toBe("critical");
	});

	it("should return overall critical when any resource is critical", () => {
		const health = buildServerHealth(12, 70, 97);

		expect(health.status).toBe("critical");
		expect(health.resources.cpu.status).toBe("ok");
		expect(health.resources.memory.status).toBe("warning");
		expect(health.resources.disk.status).toBe("critical");
	});

	it("should return overall ok when all metrics are low", () => {
		const health = buildServerHealth(12, 45, 60);

		expect(health.status).toBe("ok");
		expect(
			getOverallStatus([
				health.resources.cpu.status,
				health.resources.memory.status,
				health.resources.disk.status,
			])
		).toBe("ok");
	});
});
