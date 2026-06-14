import { describe, it, expect } from "vitest";
import { parseSshTarget } from "./ssh-target.js";

describe("parseSshTarget", () => {
	it("parses user@host with default port 22", () => {
		const result = parseSshTarget("dokku@host");
		expect(result).toEqual({ host: "host", username: "dokku", port: 22 });
	});

	it("parses user@host:port", () => {
		const result = parseSshTarget("dokku@host:2222");
		expect(result).toEqual({ host: "host", username: "dokku", port: 2222 });
	});

	it("parses unbracketed IPv6 without port", () => {
		const result = parseSshTarget("dokku@2001:db8::1");
		expect(result).toEqual({ host: "2001:db8::1", username: "dokku", port: 22 });
	});

	it("parses bracketed IPv6 without port", () => {
		const result = parseSshTarget("dokku@[2001:db8::1]");
		expect(result).toEqual({ host: "2001:db8::1", username: "dokku", port: 22 });
	});

	it("parses bracketed IPv6 with port", () => {
		const result = parseSshTarget("dokku@[2001:db8::1]:2222");
		expect(result).toEqual({ host: "2001:db8::1", username: "dokku", port: 2222 });
	});

	it("parses ssh:// URL format", () => {
		const result = parseSshTarget("ssh://dokku@myhost:2222");
		expect(result).toEqual({ host: "myhost", username: "dokku", port: 2222 });
	});

	it("parses ssh:// URL with default port", () => {
		const result = parseSshTarget("ssh://dokku@myhost");
		expect(result).toEqual({ host: "myhost", username: "dokku", port: 22 });
	});

	it("parses ssh:// URL with IPv6 host", () => {
		const result = parseSshTarget("ssh://dokku@[2001:db8::1]:2222");
		expect(result).toEqual({ host: "2001:db8::1", username: "dokku", port: 2222 });
	});

	it("rejects user@host:abc (non-numeric port)", () => {
		expect(parseSshTarget("dokku@host:abc")).toBeNull();
	});

	it("rejects user@host:0 (port zero)", () => {
		expect(parseSshTarget("dokku@host:0")).toBeNull();
	});

	it("rejects user@host:65536 (port > 65535)", () => {
		expect(parseSshTarget("dokku@host:65536")).toBeNull();
	});

	it("rejects ssh:// URL without username", () => {
		expect(parseSshTarget("ssh://myhost:2222")).toBeNull();
	});

	it("rejects input without @ character", () => {
		expect(parseSshTarget("invalidtarget")).toBeNull();
	});

	it("rejects input with @ at start", () => {
		expect(parseSshTarget("@host")).toBeNull();
	});

	it("rejects input with empty host part", () => {
		expect(parseSshTarget("dokku@")).toBeNull();
	});

	it("trims whitespace", () => {
		const result = parseSshTarget("  dokku@host:2222  ");
		expect(result).toEqual({ host: "host", username: "dokku", port: 2222 });
	});

	it("rejects bracketed IPv6 with non-numeric port", () => {
		expect(parseSshTarget("dokku@[2001:db8::1]:abc")).toBeNull();
	});

	it("rejects bracketed IPv6 with port zero", () => {
		expect(parseSshTarget("dokku@[2001:db8::1]:0")).toBeNull();
	});

	it("rejects bracketed IPv6 with port > 65535", () => {
		expect(parseSshTarget("dokku@[2001:db8::1]:65536")).toBeNull();
	});

	it("rejects malformed bracketed IPv6 (no closing bracket)", () => {
		expect(parseSshTarget("dokku@[2001:db8::1")).toBeNull();
	});

	it("rejects ssh:// URL with empty host", () => {
		expect(parseSshTarget("ssh://dokku@:2222")).toBeNull();
	});

	it("rejects ssh:// URL with empty username", () => {
		expect(parseSshTarget("ssh://@myhost:2222")).toBeNull();
	});
});
