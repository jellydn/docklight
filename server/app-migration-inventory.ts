import { execFile } from "child_process";
import { parseArgs } from "util";
import {
	collectAppMigrationInventory,
	formatAppMigrationReport,
	type InventoryRunner,
	type InventoryCommandResult,
} from "./lib/app-migration-inventory.js";

const USAGE = `Usage: bun run inventory:app --local --app <name> [--format json|report]

Read-only inventory of the LOCAL Dokku installation. No SSH or remote fallback.
No backup, restore, cleanup, DNS change or migration is performed.
Raw report values are discarded. The result is never migration-ready.

Exit codes: 0 = probes collected; 1 = invalid arguments; 2 = failed/unknown probes.
Exit 0 does not mean the manual migration blockers have been resolved.
`;

interface InventoryCliResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export async function runLocalInventoryProbe(args: string[]): Promise<InventoryCommandResult> {
	return new Promise((resolve) => {
		execFile("dokku", args, { timeout: 30_000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
			resolve({ exitCode: error ? 1 : 0, stdout: error ? "" : stdout });
		});
	});
}

export async function runAppInventoryCli(
	args: string[],
	run: InventoryRunner = runLocalInventoryProbe
): Promise<InventoryCliResult> {
	let values: ReturnType<typeof parseArgs>["values"];
	try {
		({ values } = parseArgs({
			args,
			options: {
				local: { type: "boolean" },
				app: { type: "string" },
				format: { type: "string" },
				help: { type: "boolean" },
			},
			strict: true,
			allowPositionals: false,
		}));
	} catch {
		return { exitCode: 1, stdout: "", stderr: USAGE };
	}
	if (values.help) return { exitCode: 0, stdout: USAGE, stderr: "" };
	const format = values.format ?? "report";
	if (
		!values.local ||
		typeof values.app !== "string" ||
		!["report", "json"].includes(String(format))
	) {
		return { exitCode: 1, stdout: "", stderr: USAGE };
	}
	try {
		const inventory = await collectAppMigrationInventory(values.app, run);
		return {
			exitCode: inventory.observations.some((item) => item.status !== "observed") ? 2 : 0,
			stdout:
				(format === "json"
					? JSON.stringify(inventory, null, 2)
					: formatAppMigrationReport(inventory)) + "\n",
			stderr: "",
		};
	} catch {
		return { exitCode: 1, stdout: "", stderr: "Invalid Dokku app name.\n" + USAGE };
	}
}

if (require.main === module) {
	runAppInventoryCli(process.argv.slice(2)).then((result) => {
		process.stdout.write(result.stdout);
		process.stderr.write(result.stderr);
		process.exitCode = result.exitCode;
	});
}
