import { describe, it, expect } from "vitest";
import { stripAnsi } from "./ansi.js";

describe("stripAnsi", () => {
	it("should remove basic color codes", () => {
		expect(stripAnsi("\u001b[31mRed text\u001b[0m")).toBe("Red text");
		expect(stripAnsi("\u001b[32mGreen text\u001b[0m")).toBe("Green text");
		expect(stripAnsi("\u001b[34mBlue text\u001b[0m")).toBe("Blue text");
	});

	it("should remove style codes", () => {
		expect(stripAnsi("\u001b[1mBold text\u001b[0m")).toBe("Bold text");
		expect(stripAnsi("\u001b[4mUnderlined text\u001b[0m")).toBe("Underlined text");
	});

	it("should remove combined codes", () => {
		expect(stripAnsi("\u001b[1;32mBold green\u001b[0m")).toBe("Bold green");
		expect(stripAnsi("\u001b[4;31;1mBold red underlined\u001b[0m")).toBe("Bold red underlined");
	});

	it("should handle strings without ANSI codes", () => {
		expect(stripAnsi("Plain text")).toBe("Plain text");
		expect(stripAnsi("")).toBe("");
	});

	it("should handle partial ANSI sequences", () => {
		expect(stripAnsi("\u001b[31mUnclosed color")).toBe("Unclosed color");
		expect(stripAnsi("Partial \u001b[31mcolor\u001b text")).toBe("Partial color text");
	});

	it("should remove multiple ANSI sequences from same string", () => {
		expect(stripAnsi("\u001b[31mRed\u001b[0m \u001b[32mGreen\u001b[0m \u001b[34mBlue\u001b[0m")).toBe(
			"Red Green Blue"
		);
	});

	it("should handle common Dokku output patterns", () => {
		const dokkuOutput = "\u001b[0m\u001b[32m=====> test-app deployed state:\u001b[0m \u001b[32mrunning\u001b[0m";
		expect(stripAnsi(dokkuOutput)).toBe("=====> test-app deployed state: running");
	});

	it("should remove all escape character occurrences", () => {
		expect(stripAnsi("\u001b\u001b[31mDouble escape\u001b[0m")).toBe("Double escape");
	});
});
