import { describe, it, expect } from "vitest";
import {
	parseReportLine,
	parseBoolean,
	extractExpiry,
	parseLetsencryptReport,
	parseCertsReport,
	parseLetsencryptList,
} from "./ssl.js";

describe("parseReportLine", () => {
	it("should parse standard key-value format", () => {
		const result = parseReportLine("Enabled: true");
		expect(result).toEqual({ key: "enabled", value: "true" });
	});

	it("should parse with extra whitespace", () => {
		const result = parseReportLine("  Status   :   active  ");
		expect(result).toEqual({ key: "status", value: "active" });
	});

	it("should return null for lines without colon", () => {
		expect(parseReportLine("just some text")).toBeNull();
	});

	it("should return null for empty lines", () => {
		expect(parseReportLine("")).toBeNull();
	});

	it("should return null for whitespace-only lines", () => {
		expect(parseReportLine("   ")).toBeNull();
	});

	it("should handle ANSI escape codes", () => {
		const result = parseReportLine("\x1b[32mEnabled\x1b[0m: \x1b[36mtrue\x1b[0m");
		expect(result).toEqual({ key: "enabled", value: "true" });
	});

	it("should handle values with colons", () => {
		const result = parseReportLine("Subject: CN=example.com:8080");
		expect(result).toEqual({ key: "subject", value: "CN=example.com:8080" });
	});

	it("should handle empty values", () => {
		const result = parseReportLine("Expiry:");
		expect(result).toEqual({ key: "expiry", value: "" });
	});
});

describe("parseBoolean", () => {
	it("should parse 'true'", () => {
		expect(parseBoolean("true")).toBe(true);
	});

	it("should parse 'True'", () => {
		expect(parseBoolean("True")).toBe(true);
	});

	it("should parse 'TRUE'", () => {
		expect(parseBoolean("TRUE")).toBe(true);
	});

	it("should parse 'false'", () => {
		expect(parseBoolean("false")).toBe(false);
	});

	it("should parse 'False'", () => {
		expect(parseBoolean("False")).toBe(false);
	});

	it("should parse 'FALSE'", () => {
		expect(parseBoolean("FALSE")).toBe(false);
	});

	it("should return null for non-boolean strings", () => {
		expect(parseBoolean("yes")).toBeNull();
		expect(parseBoolean("no")).toBeNull();
		expect(parseBoolean("1")).toBeNull();
		expect(parseBoolean("0")).toBeNull();
		expect(parseBoolean("")).toBeNull();
	});

	it("should handle whitespace", () => {
		expect(parseBoolean("  true  ")).toBe(true);
		expect(parseBoolean("  false  ")).toBe(false);
	});
});

describe("extractExpiry", () => {
	it("should extract date from standard format", () => {
		expect(extractExpiry("2024-12-31")).toBe("2024-12-31");
	});

	it("should extract date from longer string", () => {
		expect(extractExpiry("Expires: 2024-06-15")).toBe("2024-06-15");
	});

	it("should return undefined when no date found", () => {
		expect(extractExpiry("no date here")).toBeUndefined();
	});

	it("should extract first date when multiple present", () => {
		expect(extractExpiry("2024-01-01 to 2024-12-31")).toBe("2024-01-01");
	});

	it("should handle ISO date with time", () => {
		expect(extractExpiry("2024-03-15T14:30:00Z")).toBe("2024-03-15");
	});

	it("should not match invalid date formats", () => {
		expect(extractExpiry("2024/03/15")).toBeUndefined();
		expect(extractExpiry("15-03-2024")).toBeUndefined();
	});
});

describe("parseLetsencryptReport", () => {
	it("should parse active letsencrypt status", () => {
		const stdout = `Enabled: true
Expires: 2024-12-31`;
		const result = parseLetsencryptReport(stdout);
		expect(result).toEqual({
			active: true,
			certProvider: "letsencrypt",
			expiryDate: "2024-12-31",
		});
	});

	it("should parse inactive letsencrypt status", () => {
		const stdout = `Enabled: false
Expires: 2024-01-01`;
		const result = parseLetsencryptReport(stdout);
		expect(result).toEqual({
			active: false,
			certProvider: "letsencrypt",
			expiryDate: "2024-01-01",
		});
	});

	it("should return null when no active status found", () => {
		const stdout = `Some other: value
No status here`;
		expect(parseLetsencryptReport(stdout)).toBeNull();
	});

	it("should handle 'active' key instead of 'enabled'", () => {
		const stdout = `Active: true`;
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(true);
	});

	it("should handle 'exists' key", () => {
		const stdout = `Exists: true`;
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(true);
	});

	it("should handle 'registered' key", () => {
		const stdout = `Registered: true`;
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(true);
	});

	it("should handle various expiry keys", () => {
		const stdout = `Enabled: true
Not after: 2024-12-31`;
		const result = parseLetsencryptReport(stdout);
		expect(result?.expiryDate).toBe("2024-12-31");
	});

	it("should handle 'expiration' key", () => {
		const stdout = `Enabled: true
Expiration: 2025-06-15`;
		const result = parseLetsencryptReport(stdout);
		expect(result?.expiryDate).toBe("2025-06-15");
	});

	it("should handle ANSI codes", () => {
		const stdout = "\x1b[32mEnabled\x1b[0m: \x1b[36mtrue\x1b[0m";
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(true);
	});

	it("should work without expiry date", () => {
		const stdout = `Enabled: true`;
		const result = parseLetsencryptReport(stdout);
		expect(result).toEqual({
			active: true,
			certProvider: "letsencrypt",
			expiryDate: undefined,
		});
	});
});

describe("parseCertsReport", () => {
	it("should parse active custom certificate", () => {
		const stdout = `SSL enabled: true
Subject: CN=example.com
Not after: 2024-12-31`;
		const result = parseCertsReport(stdout);
		expect(result).toEqual({
			active: true,
			certProvider: "custom",
			expiryDate: "2024-12-31",
		});
	});

	it("should parse based on cert evidence when no explicit active flag", () => {
		const stdout = `Subject: CN=example.com
Issuer: Let's Encrypt
Not after: 2024-12-31`;
		const result = parseCertsReport(stdout);
		expect(result).toEqual({
			active: true,
			certProvider: "custom",
			expiryDate: "2024-12-31",
		});
	});

	it("should return null when no cert evidence or active flag", () => {
		const stdout = `Some other: value`;
		expect(parseCertsReport(stdout)).toBeNull();
	});

	it("should handle 'certificate enabled' key", () => {
		const stdout = `Certificate enabled: true`;
		const result = parseCertsReport(stdout);
		expect(result?.active).toBe(true);
	});

	it("should handle 'certificates enabled' key", () => {
		const stdout = `Certificates enabled: true`;
		const result = parseCertsReport(stdout);
		expect(result?.active).toBe(true);
	});

	it("should use explicit false when provided", () => {
		const stdout = `SSL enabled: false
Subject: CN=example.com`;
		const result = parseCertsReport(stdout);
		expect(result?.active).toBe(false);
	});

	it("should handle multiple date keys and use first expiry", () => {
		const stdout = `SSL enabled: true
Not before: 2024-01-01
Not after: 2024-12-31`;
		const result = parseCertsReport(stdout);
		expect(result?.expiryDate).toBe("2024-12-31");
	});
});

describe("parseLetsencryptList", () => {
	it("should find app in letsencrypt list output", () => {
		const stdout = `myapp    2024-12-31
otherapp 2025-01-15`;
		const result = parseLetsencryptList(stdout, "myapp");
		expect(result).toEqual({
			active: true,
			certProvider: "letsencrypt",
			expiryDate: "2024-12-31",
		});
	});

	it("should be case insensitive", () => {
		const stdout = `MyApp 2024-12-31`;
		const result = parseLetsencryptList(stdout, "myapp");
		expect(result?.active).toBe(true);
	});

	it("should return null when app not found", () => {
		const stdout = `otherapp 2024-12-31`;
		expect(parseLetsencryptList(stdout, "myapp")).toBeNull();
	});

	it("should handle empty output", () => {
		expect(parseLetsencryptList("", "myapp")).toBeNull();
	});

	it("should handle ANSI codes", () => {
		const stdout = "\x1b[32mmyapp\x1b[0m 2024-12-31";
		const result = parseLetsencryptList(stdout, "myapp");
		expect(result?.active).toBe(true);
	});

	it("should handle extra whitespace", () => {
		const stdout = `myapp     2024-12-31`;
		const result = parseLetsencryptList(stdout, "myapp");
		expect(result?.expiryDate).toBe("2024-12-31");
	});

	it("should work without expiry date", () => {
		const stdout = `myapp`;
		const result = parseLetsencryptList(stdout, "myapp");
		expect(result).toEqual({
			active: true,
			certProvider: "letsencrypt",
			expiryDate: undefined,
		});
	});

	it("should find first matching app in list", () => {
		const stdout = `myapp 2024-12-31
otherapp 2025-01-15`;
		const result = parseLetsencryptList(stdout, "myapp");
		expect(result?.expiryDate).toBe("2024-12-31");
	});
});

describe("parseLetsencryptReport - multi-version fixtures", () => {
	it("should parse Dokku 0.30.x letsencrypt:report output", () => {
		const stdout = [
			"=====> myapp letsencrypt information",
			"       Letsencrypt active:            true",
			"       Letsencrypt expiry:            2024-12-31",
			"       Letsencrypt registered:        true",
		].join("\n");
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(true);
		expect(result?.expiryDate).toBe("2024-12-31");
		expect(result?.certProvider).toBe("letsencrypt");
	});

	it("should parse Dokku 0.31.x letsencrypt:report with enabled key", () => {
		const stdout = [
			"=====> myapp letsencrypt information",
			"       Letsencrypt enabled:           true",
			"       Letsencrypt expiry:            2025-06-15",
		].join("\n");
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(true);
		expect(result?.expiryDate).toBe("2025-06-15");
	});

	it("should parse Dokku 0.34.x letsencrypt:report with not after key", () => {
		const stdout = [
			"=====> myapp letsencrypt information",
			"       Letsencrypt active:            true",
			"       Letsencrypt not after:         2025-03-20",
		].join("\n");
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(true);
		expect(result?.expiryDate).toBe("2025-03-20");
	});

	it("should handle letsencrypt disabled state", () => {
		const stdout = [
			"=====> myapp letsencrypt information",
			"       Letsencrypt active:            false",
		].join("\n");
		const result = parseLetsencryptReport(stdout);
		expect(result?.active).toBe(false);
	});
});

describe("parseCertsReport - multi-version fixtures", () => {
	it("should parse Dokku 0.30.x certs:report with ssl enabled key", () => {
		const stdout = [
			"=====> myapp certs information",
			"       SSL enabled:                   true",
			"       Subject:                       CN=myapp.example.com",
			"       Not after:                     2024-12-31",
		].join("\n");
		const result = parseCertsReport(stdout);
		expect(result?.active).toBe(true);
		expect(result?.expiryDate).toBe("2024-12-31");
		expect(result?.certProvider).toBe("custom");
	});

	it("should parse Dokku 0.31.x certs:report with certificate enabled key", () => {
		const stdout = [
			"=====> myapp certs information",
			"       Certificate enabled:           true",
			"       Issuer:                        Let's Encrypt",
			"       Not after:                     2025-06-15",
		].join("\n");
		const result = parseCertsReport(stdout);
		expect(result?.active).toBe(true);
		expect(result?.expiryDate).toBe("2025-06-15");
	});

	it("should infer active from cert evidence when no explicit enabled key", () => {
		const stdout = [
			"=====> myapp certs information",
			"       Subject:                       CN=myapp.example.com",
			"       Issuer:                        DigiCert Inc",
			"       Not before:                    2024-01-01",
			"       Not after:                     2024-12-31",
		].join("\n");
		const result = parseCertsReport(stdout);
		expect(result?.active).toBe(true);
		expect(result?.expiryDate).toBe("2024-12-31");
	});

	it("should return null for app without any certificate", () => {
		const stdout = [
			"=====> myapp certs information",
			"       No SSL certificate configured",
		].join("\n");
		expect(parseCertsReport(stdout)).toBeNull();
	});
});

