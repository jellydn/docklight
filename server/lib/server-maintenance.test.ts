import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apps.js", () => ({
	listAppNames: vi.fn(),
}));

vi.mock("./executor.js", () => ({
	executeCommand: vi.fn(),
}));

import { listAppNames } from "./apps.js";
import { executeCommand } from "./executor.js";
import {
	MAINTENANCE_TIMEOUT_MS,
	PURGE_AGGREGATE_COMMAND,
	PURGE_CACHE_TIMEOUT_MS,
	purgeAllAppCaches,
	runCleanup,
} from "./server-maintenance.js";

describe("server-maintenance", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("runCleanup", () => {
		it("should run dokku cleanup", async () => {
			vi.mocked(executeCommand).mockResolvedValue({
				command: "dokku cleanup",
				exitCode: 0,
				stdout: "Cleanup complete",
				stderr: "",
			});

			const result = await runCleanup("1");

			expect(result).toEqual({
				command: "dokku cleanup",
				exitCode: 0,
				stdout: "Cleanup complete",
				stderr: "",
			});
			expect(executeCommand).toHaveBeenCalledWith("dokku cleanup", MAINTENANCE_TIMEOUT_MS, {
				userId: "1",
			});
		});
	});

	describe("purgeAllAppCaches", () => {
		it("should purge caches for all listed apps", async () => {
			vi.mocked(listAppNames).mockResolvedValue({
				ok: true,
				names: ["app-one", "app-two"],
			});
			vi.mocked(executeCommand).mockImplementation(async (command: any) => {
				if (command === "dokku repo:purge-cache 'app-one'") {
					return {
						command,
						exitCode: 0,
						stdout: "Purged app-one",
						stderr: "",
					};
				}
				return {
					command,
					exitCode: 0,
					stdout: "Purged app-two",
					stderr: "",
				};
			});

			const result = await purgeAllAppCaches("1");

			expect(result).toEqual({
				command: PURGE_AGGREGATE_COMMAND,
				exitCode: 0,
				stdout: "Purged app-one\nPurged app-two",
				stderr: "",
				results: [
					{
						app: "app-one",
						command: "dokku repo:purge-cache 'app-one'",
						exitCode: 0,
						stdout: "Purged app-one",
						stderr: "",
					},
					{
						app: "app-two",
						command: "dokku repo:purge-cache 'app-two'",
						exitCode: 0,
						stdout: "Purged app-two",
						stderr: "",
					},
				],
			});
			expect(executeCommand).toHaveBeenCalledTimes(2);
			expect(executeCommand).toHaveBeenCalledWith(
				"dokku repo:purge-cache 'app-one'",
				PURGE_CACHE_TIMEOUT_MS,
				{ userId: "1" }
			);
			expect(executeCommand).toHaveBeenCalledWith(
				"dokku repo:purge-cache 'app-two'",
				PURGE_CACHE_TIMEOUT_MS,
				{ userId: "1" }
			);
		});

		it("should return an error when app listing fails", async () => {
			vi.mocked(listAppNames).mockResolvedValue({
				ok: false,
				error: {
					command: "dokku apps:list",
					exitCode: 1,
					stdout: "",
					stderr: "apps list failed",
				},
			});

			const result = await purgeAllAppCaches("1");

			expect(result).toEqual({
				command: PURGE_AGGREGATE_COMMAND,
				exitCode: 1,
				stdout: "",
				stderr: "apps list failed",
				results: [],
			});
			expect(executeCommand).not.toHaveBeenCalled();
		});

		it("should return aggregate failure when one app purge fails", async () => {
			vi.mocked(listAppNames).mockResolvedValue({
				ok: true,
				names: ["app-one", "app-two"],
			});
			vi.mocked(executeCommand).mockImplementation(async (command: any) => {
				if (command === "dokku repo:purge-cache 'app-two'") {
					return {
						command,
						exitCode: 1,
						stdout: "",
						stderr: "purge failed",
					};
				}
				return {
					command,
					exitCode: 0,
					stdout: "Purged app-one",
					stderr: "",
				};
			});

			const result = await purgeAllAppCaches("1");

			expect(result).toEqual({
				command: PURGE_AGGREGATE_COMMAND,
				exitCode: 1,
				stdout: "Purged app-one",
				stderr: "purge failed",
				results: [
					{
						app: "app-one",
						command: "dokku repo:purge-cache 'app-one'",
						exitCode: 0,
						stdout: "Purged app-one",
						stderr: "",
					},
					{
						app: "app-two",
						command: "dokku repo:purge-cache 'app-two'",
						exitCode: 1,
						stdout: "",
						stderr: "purge failed",
					},
				],
			});
		});
	});
});
