import { describe, expect, it } from "vitest";
import {
	buildServerHealth,
	getResourceStatus,
	HEALTH_CRITICAL_THRESHOLD,
	HEALTH_WARNING_THRESHOLD,
} from "./server.js";

describe("server health status", () => {
	it("should mark values below warning threshold as ok", () => {
		expect(getResourceStatus(12)).toBe("ok");
		expect(getResourceStatus(HEALTH_WARNING_THRESHOLD - 0.1)).toBe("ok");
	});

	it("should mark values from warning threshold to below critical as warning", () => {
		expect(getResourceStatus(HEALTH_WARNING_THRESHOLD)).toBe("warning");
		expect(getResourceStatus(HEALTH_CRITICAL_THRESHOLD - 0.1)).toBe("warning");
	});

	it("should mark values at or above critical threshold as critical", () => {
		expect(getResourceStatus(HEALTH_CRITICAL_THRESHOLD)).toBe("critical");
		expect(getResourceStatus(97)).toBe("critical");
	});

	it("should return overall critical when any resource is critical", () => {
		const health = buildServerHealth(12, HEALTH_WARNING_THRESHOLD, 97);

		expect(health.status).toBe("critical");
		expect(health.resources.cpu.status).toBe("ok");
		expect(health.resources.memory.status).toBe("warning");
		expect(health.resources.disk.status).toBe("critical");
	});

	it("should return overall ok when all metrics are low", () => {
		const health = buildServerHealth(12, 45, 60);

		expect(health.status).toBe("ok");
		expect(health.resources.cpu.status).toBe("ok");
		expect(health.resources.memory.status).toBe("ok");
		expect(health.resources.disk.status).toBe("ok");
	});
});
