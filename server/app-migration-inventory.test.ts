import { execFile } from "child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runAppInventoryCli, runLocalInventoryProbe } from "./app-migration-inventory.js";

vi.mock("child_process", () => ({ execFile: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe("per-app inventory CLI", () => {
	it("shows help without probing Dokku", async () => {
		const run = vi.fn();
		const result = await runAppInventoryCli(["--help"], run);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("never migration-ready");
		expect(run).not.toHaveBeenCalled();
	});

	it.each([
		{ args: [] },
		{ args: ["--app", "pilot"] },
		{ args: ["--local"] },
		{ args: ["--local", "--app", "pilot;cleanup"] },
		{ args: ["--local", "--app", "pilot", "--format", "yaml"] },
		{ args: ["--local", "--app", "pilot", "--target", "example.invalid"] },
	])("rejects unsafe or incomplete arguments $args without probing", async ({ args }) => {
		const run = vi.fn();
		expect((await runAppInventoryCli(args, run)).exitCode).toBe(1);
		expect(run).not.toHaveBeenCalled();
	});

	it("returns a partial JSON manifest without leaking failed command output", async () => {
		const run = vi.fn(async () => ({ exitCode: 1, stdout: "private host diagnostics" }));
		const result = await runAppInventoryCli(["--local", "--app", "pilot", "--format", "json"], run);
		expect(result.exitCode).toBe(2);
		expect(JSON.parse(result.stdout)).toMatchObject({
			app: "pilot",
			phase: "inventory-only",
			readyForMigration: false,
			observations: [{ section: "apps", status: "failed" }],
		});
		expect(result.stdout).not.toContain("private host diagnostics");
		expect(result.stderr).toBe("");
	});

	it("prints a human report and returns 0 for successful probes, not migration readiness", async () => {
		const outputs: Record<string, string> = {
			"apps:list": "pilot",
			"config:keys": "PORT",
			"plugin:list": "00_dokku-standard 0.38.31 enabled dokku core standard plugin",
		};
		const run = vi.fn(async (args: string[]) => ({
			exitCode: 0,
			stdout: outputs[args[0] === "--quiet" ? args[1] : args[0]] ?? "Report present",
		}));
		const result = await runAppInventoryCli(["--local", "--app", "pilot"], run);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("NOT ready for migration");
		expect(result.stdout).toContain("Review all plugins");
	});

	it("executes local Dokku directly with bounded output/time and no shell or SSH", async () => {
		vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
			const callback = args[3] as (err: null, stdout: string, stderr: string) => void;
			callback(null, "pilot", "");
			return {} as ReturnType<typeof execFile>;
		});
		expect(await runLocalInventoryProbe(["--quiet", "apps:list"])).toEqual({
			exitCode: 0,
			stdout: "pilot",
		});
		expect(execFile).toHaveBeenCalledWith(
			"dokku",
			["--quiet", "apps:list"],
			{ timeout: 30_000, maxBuffer: 1024 * 1024 },
			expect.any(Function)
		);
	});

	it("discards execution errors instead of printing or falling back to remote settings", async () => {
		vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
			const callback = args[3] as (err: Error) => void;
			callback(new Error("private host diagnostics"));
			return {} as ReturnType<typeof execFile>;
		});
		expect(await runLocalInventoryProbe(["--quiet", "apps:list"])).toEqual({
			exitCode: 1,
			stdout: "",
		});
		expect(execFile).toHaveBeenCalledTimes(1);
	});
});
