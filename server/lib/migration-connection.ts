import { createHash, randomUUID } from "crypto";
import { isIP } from "net";
import { NodeSSH } from "node-ssh";
import { parseSshTarget, type ParsedSshTarget } from "./ssh-target.js";
import { shellQuote } from "./shell.js";
import { readMigrationFile, writeMigrationFile } from "./migration-store.js";

export interface MigrationDestination {
	target: string;
	fingerprint: string;
	revision: string;
}

export interface MigrationEndpoint extends ParsedSshTarget {
	fingerprint: string;
	keyPath: string;
}

function endpoint(target: string, fingerprint: string, keyPath: string): MigrationEndpoint {
	const parsed = parseSshTarget(target);
	if (
		target.startsWith("ssh://") ||
		!parsed ||
		!/^[a-z_][a-z0-9_-]{0,31}$/i.test(parsed.username) ||
		!(isIP(parsed.host) || /^[a-z0-9][a-z0-9.-]{0,252}$/i.test(parsed.host)) ||
		!/^SHA256:[A-Za-z0-9+/]{43}$/.test(fingerprint) ||
		!keyPath.startsWith("/")
	) {
		throw new Error("Migration endpoint or server-side key configuration is invalid.");
	}
	return { ...parsed, fingerprint, keyPath };
}

function canonicalTarget(target: string): string | null {
	if (target.startsWith("ssh://")) return null;
	const parsed = parseSshTarget(target);
	if (!parsed) return null;
	return `${parsed.username}@${parsed.host.toLowerCase()}:${parsed.port}`;
}

function requireAllowedTarget(target: string): void {
	const allowed = (process.env.DOCKLIGHT_MIGRATION_ALLOWED_TARGETS || "")
		.split(",")
		.map(canonicalTarget)
		.filter(Boolean);
	const canonical = canonicalTarget(target);
	if (!canonical || !allowed.includes(canonical))
		throw new Error("Destination is not in the operator-approved endpoint list.");
}

export function sourceEndpoint(): MigrationEndpoint {
	return endpoint(
		process.env.DOCKLIGHT_MIGRATION_SOURCE_TARGET || "",
		process.env.DOCKLIGHT_MIGRATION_SOURCE_FINGERPRINT || "",
		process.env.DOCKLIGHT_MIGRATION_SOURCE_KEY_PATH || ""
	);
}

export function destinationEndpoint(): MigrationEndpoint {
	const destination = readMigrationFile<MigrationDestination>("destination.json");
	if (!destination) throw new Error("Save a destination first.");
	requireAllowedTarget(destination.target);
	return endpoint(
		destination.target,
		destination.fingerprint,
		process.env.DOCKLIGHT_MIGRATION_DESTINATION_KEY_PATH || ""
	);
}

export function destinationSummary(): {
	configured: boolean;
	revision: string | null;
	sourceConfigured: boolean;
} {
	const destination = readMigrationFile<MigrationDestination>("destination.json");
	let sourceConfigured = false;
	try {
		sourceEndpoint();
		sourceConfigured = true;
	} catch {
		return { configured: !!destination, revision: destination?.revision ?? null, sourceConfigured };
	}
	return { configured: !!destination, revision: destination?.revision ?? null, sourceConfigured };
}

export function saveMigrationDestination(
	target: unknown,
	fingerprint: unknown
): ReturnType<typeof destinationSummary> {
	if (typeof target !== "string" || typeof fingerprint !== "string" || target.length > 300)
		throw new Error("Invalid destination configuration.");
	requireAllowedTarget(target);
	const canonical = canonicalTarget(target);
	const parsed = endpoint(
		target,
		fingerprint,
		process.env.DOCKLIGHT_MIGRATION_DESTINATION_KEY_PATH || ""
	);
	const source = sourceEndpoint();
	if (
		parsed.fingerprint === source.fingerprint ||
		canonical === canonicalTarget(process.env.DOCKLIGHT_MIGRATION_SOURCE_TARGET || "")
	)
		throw new Error("Source and destination must be different hosts.");
	writeMigrationFile("destination.json", {
		target,
		fingerprint,
		revision: randomUUID(),
	} satisfies MigrationDestination);
	return destinationSummary();
}

export class MigrationConnection {
	constructor(
		readonly ssh: NodeSSH,
		readonly signal: AbortSignal
	) {}

	async command(args: string[]): Promise<string> {
		this.signal.throwIfAborted();
		let bytes = 0;
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			const result = await Promise.race([
				this.ssh.execCommand(args.map(shellQuote).join(" "), {
					onStdout: (chunk) => {
						bytes += chunk.length;
						if (bytes > 1024 * 1024) this.ssh.dispose();
					},
					onStderr: (chunk) => {
						bytes += chunk.length;
						if (bytes > 1024 * 1024) this.ssh.dispose();
					},
				}),
				new Promise<never>((_, reject) => {
					timer = setTimeout(() => {
						this.ssh.dispose();
						reject(new Error("Migration command timed out."));
					}, 30_000);
				}),
			]);
			this.signal.throwIfAborted();
			if (
				bytes > 1024 * 1024 ||
				Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr) > 1024 * 1024 ||
				result.code !== 0
			)
				throw new Error();
			return result.stdout;
		} catch {
			throw new Error("Migration command failed or timed out. No raw diagnostics were retained.");
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
}

export async function withMigrationConnection<T>(
	profile: MigrationEndpoint,
	signal: AbortSignal,
	work: (connection: MigrationConnection) => Promise<T>
): Promise<T> {
	signal.throwIfAborted();
	const ssh = new NodeSSH();
	const controller = new AbortController();
	let rejectOperation: (error: Error) => void = () => undefined;
	const interrupted = new Promise<never>((_, reject) => {
		rejectOperation = reject;
	});
	const abort = (): void => {
		controller.abort();
		ssh.dispose();
		rejectOperation(new Error("Migration operation interrupted."));
	};
	signal.addEventListener("abort", abort, { once: true });
	const deadline = setTimeout(abort, 120_000);
	try {
		return await Promise.race([
			interrupted,
			(async () => {
				await ssh.connect({
					host: profile.host,
					port: profile.port,
					username: profile.username,
					privateKeyPath: profile.keyPath,
					readyTimeout: 10_000,
					hostVerifier: (key: Buffer) =>
						`SHA256:${createHash("sha256").update(key).digest("base64").replace(/=+$/, "")}` ===
						profile.fingerprint,
				});
				controller.signal.throwIfAborted();
				return work(new MigrationConnection(ssh, controller.signal));
			})(),
		]);
	} catch {
		throw new Error(
			signal.aborted
				? "Migration operation cancelled."
				: "Pinned SSH operation failed. Check host key, server-side credentials and capabilities."
		);
	} finally {
		clearTimeout(deadline);
		signal.removeEventListener("abort", abort);
		ssh.dispose();
	}
}

export async function testMigrationConnection(
	signal: AbortSignal
): Promise<{ success: true; sourceReadable: true; destinationSftp: true }> {
	const source = sourceEndpoint();
	const destination = destinationEndpoint();
	if (
		source.fingerprint === destination.fingerprint ||
		(source.host.toLowerCase() === destination.host.toLowerCase() &&
			source.port === destination.port)
	)
		throw new Error("Source and destination must be different hosts.");
	await withMigrationConnection(source, signal, async (connection) => {
		await connection.command(["dokku", "version"]);
		await connection.command(["dokku", "--quiet", "apps:list"]);
	});
	await withMigrationConnection(destination, signal, async (connection) => {
		await connection.command(["dokku", "version"]);
		await connection.ssh.requestSFTP();
	});
	return { success: true, sourceReadable: true, destinationSftp: true };
}
