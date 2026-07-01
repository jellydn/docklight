import { describe, it, expect } from "vitest";
import {
	alertBannerClass,
	healthBannerClass,
	statusBadgeClass,
	statusDotClass,
} from "./status-styles.js";

describe("status-styles", () => {
	it("returns running badge classes", () => {
		expect(statusBadgeClass("running")).toContain("bg-success-surface");
		expect(statusBadgeClass("running")).toContain("text-success-on-surface");
	});

	it("returns stopped badge classes", () => {
		expect(statusBadgeClass("stopped")).toContain("bg-destructive-surface");
	});

	it("returns status dot classes", () => {
		expect(statusDotClass("running")).toBe("bg-success-on-surface");
		expect(statusDotClass("stopped")).toBe("bg-destructive-on-surface");
	});

	it("returns alert banner variants", () => {
		expect(alertBannerClass("error")).toContain("bg-destructive-surface");
		expect(alertBannerClass("success")).toContain("bg-success-surface");
		expect(alertBannerClass("warning")).toContain("bg-warning-surface");
	});

	it("returns health banner classes", () => {
		expect(healthBannerClass("ok")).toContain("bg-success-surface");
		expect(healthBannerClass("critical")).toContain("bg-destructive-surface");
	});
});
