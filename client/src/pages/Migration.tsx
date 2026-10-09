import { useQuery } from "@tanstack/react-query";
import { type JSX, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { apiFetch } from "@/lib/api.js";
import { alertBannerClass } from "@/lib/status-styles.js";

const DestinationSchema = z.object({
	configured: z.boolean(),
	sourceConfigured: z.boolean(),
	revision: z.string().nullable(),
});
const PreviewSchema = z.object({
	app: z.string(),
	destinationRevision: z.string(),
	readyForSync: z.literal(false),
	configKeyCount: z.number(),
	databaseServiceCount: z.number(),
	sharedServiceCount: z.number(),
	failedChecks: z.number(),
	blockers: z.array(z.string()),
});
type Preview = z.infer<typeof PreviewSchema>;
type Operation = "save" | "test" | "apps" | "preview";

export function Migration(): JSX.Element {
	const destination = useQuery({
		queryKey: ["migration", "destination"],
		queryFn: () => apiFetch("/migration/destination", DestinationSchema),
		retry: false,
	});
	const [target, setTarget] = useState("");
	const [fingerprint, setFingerprint] = useState("");
	const [apps, setApps] = useState<string[]>([]);
	const [app, setApp] = useState("");
	const [preview, setPreview] = useState<Preview | null>(null);
	const [operation, setOperation] = useState<Operation | null>(null);
	const [message, setMessage] = useState("");
	const [failed, setFailed] = useState(false);
	const controller = useRef<AbortController | null>(null);
	useEffect(() => () => controller.current?.abort(), []);

	async function run(next: Operation): Promise<void> {
		if (controller.current) return;
		const request = new AbortController();
		controller.current = request;
		setOperation(next);
		setMessage("");
		setFailed(false);
		setPreview(null);
		const timer = setTimeout(() => request.abort(), 250_000);
		const options: RequestInit = {
			method: "POST",
			headers: { "X-Docklight-Migration": "1" },
			signal: request.signal,
		};
		try {
			if (next === "save") {
				await apiFetch("/migration/destination", DestinationSchema, {
					...options,
					method: "PUT",
					body: JSON.stringify({ target, fingerprint }),
				});
				setTarget("");
				setFingerprint("");
				await destination.refetch();
				setMessage(
					"Destination saved. Its address and fingerprint are hidden. Run the read-only test next."
				);
			} else if (next === "test") {
				await apiFetch(
					"/migration/test",
					z.object({
						success: z.literal(true),
						sourceReadable: z.literal(true),
						destinationSftp: z.literal(true),
					}),
					options
				);
				setMessage(
					"Pinned connections passed read-only Dokku and SFTP checks. This does not approve a sync."
				);
			} else if (next === "apps") {
				const result = await apiFetch(
					"/migration/apps",
					z.object({ apps: z.array(z.string()) }),
					options
				);
				setApps(result.apps);
				setApp("");
				setMessage(
					result.apps.length
						? "Source apps loaded. Select one app for a read-only preview."
						: "No source apps found."
				);
			} else {
				const result = await apiFetch("/migration/preview", PreviewSchema, {
					...options,
					body: JSON.stringify({ app, revision: destination.data?.revision }),
				});
				setPreview(result);
				setMessage("Preview complete. Review the blockers before planning a sync.");
			}
		} catch {
			setFailed(true);
			setMessage(
				request.signal.aborted
					? "Request cancelled or timed out. Read-only checks can be restarted. If a save was interrupted, refresh the saved state before retrying."
					: "Request failed. Refresh the saved state before retrying a save. Check server-side setup, approved endpoints and independently verified host keys. No raw diagnostics are shown."
			);
		} finally {
			clearTimeout(timer);
			controller.current = null;
			setOperation(null);
		}
	}

	const busy = operation !== null;
	const connected = destination.data?.configured && destination.data?.sourceConfigured;
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">App migration</h1>
				<p className="mt-1 text-muted-foreground">
					Prepare one app for a new VPS. This release is read-only on both hosts.
				</p>
			</div>
			<div className={alertBannerClass("warning")}>
				<strong>Sync is not available yet.</strong> Database and volume adapters, write fencing and
				resumable sync jobs must be tested first. Nothing here restores, deploys, changes DNS or
				prunes data.
			</div>
			{destination.isLoading && <p role="status">Loading saved state…</p>}
			{destination.isError && (
				<p role="alert" className="text-destructive">
					Saved state is unavailable. Check admin access and server-side encryption configuration.
				</p>
			)}
			<section
				className="rounded-xl border bg-card p-5 space-y-4"
				aria-labelledby="destination-heading"
			>
				<h2 id="destination-heading" className="text-lg font-semibold">
					1. Configure destination
				</h2>
				<p className="text-sm text-muted-foreground">
					An operator must provision the source, separate server-side keys, encryption key and
					approved destination list. Verify the destination fingerprint through a trusted console,
					not an unverified key scan. Do not paste private keys or config values here.
				</p>
				<p className="text-sm">
					Source: {destination.data?.sourceConfigured ? "configured" : "not configured"} ·
					Destination: {destination.data?.configured ? "saved (hidden)" : "not saved"}
				</p>
				<form
					className="space-y-4"
					autoComplete="off"
					onSubmit={(event) => {
						event.preventDefault();
						void run("save");
					}}
				>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<label htmlFor="migration-target" className="text-sm font-medium">
								Destination SSH target
							</label>
							<Input
								id="migration-target"
								type="password"
								autoComplete="off"
								placeholder="user@host[:port]"
								value={target}
								onChange={(event) => setTarget(event.target.value)}
								disabled={busy}
								required
								maxLength={300}
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="migration-pin" className="text-sm font-medium">
								Verified SHA256 host fingerprint
							</label>
							<Input
								id="migration-pin"
								type="password"
								autoComplete="off"
								placeholder="SHA256:…"
								value={fingerprint}
								onChange={(event) => setFingerprint(event.target.value)}
								disabled={busy}
								required
								maxLength={60}
							/>
						</div>
					</div>
					<Button
						type="submit"
						disabled={busy || !target || !fingerprint || !destination.data?.sourceConfigured}
					>
						Save destination
					</Button>
				</form>
			</section>
			<section
				className="rounded-xl border bg-card p-5 space-y-4"
				aria-labelledby="preview-heading"
			>
				<h2 id="preview-heading" className="text-lg font-semibold">
					2. Test and preview one app
				</h2>
				<p className="text-sm text-muted-foreground">
					Checks run only when requested. Commands stop after 30 seconds; each host operation has a
					two-minute limit. Progress is a phase, not a transfer percentage.
				</p>
				<div className="flex flex-wrap gap-3">
					<Button
						type="button"
						variant="outline"
						disabled={busy || !connected}
						onClick={() => void run("test")}
					>
						Test pinned connections
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={busy || !connected}
						onClick={() => void run("apps")}
					>
						Load source apps
					</Button>
				</div>
				<div className="flex flex-col sm:flex-row gap-3">
					<div className="flex-1 space-y-2">
						<label htmlFor="migration-app" className="text-sm font-medium">
							Source app
						</label>
						<select
							id="migration-app"
							className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
							value={app}
							disabled={busy || !apps.length}
							onChange={(event) => {
								setApp(event.target.value);
								setPreview(null);
							}}
						>
							<option value="">Select one app</option>
							{apps.map((name) => (
								<option key={name} value={name}>
									{name}
								</option>
							))}
						</select>
					</div>
					<Button
						type="button"
						className="self-end"
						disabled={busy || !app || !connected}
						onClick={() => void run("preview")}
					>
						Build read-only preview
					</Button>
				</div>
			</section>
			{busy && (
				<div role="status" className="rounded-lg border p-4 flex flex-wrap items-center gap-3">
					<span>
						{operation === "save"
							? "Saving encrypted destination…"
							: `Running read-only ${operation} checks…`}
					</span>
					{operation !== "save" && (
						<Button type="button" variant="outline" onClick={() => controller.current?.abort()}>
							Cancel checks
						</Button>
					)}
				</div>
			)}
			{message && (
				<p
					role={failed ? "alert" : "status"}
					className={failed ? "text-destructive" : "text-muted-foreground"}
				>
					{message}
				</p>
			)}
			{preview && (
				<section
					className="rounded-xl border bg-card p-5 space-y-4"
					aria-labelledby="report-heading"
				>
					<h2 id="report-heading" className="text-lg font-semibold">
						Preview: {preview.app}
					</h2>
					<p className="text-sm">
						{preview.configKeyCount} config keys · {preview.databaseServiceCount} database services
						· {preview.sharedServiceCount} shared services · {preview.failedChecks} incomplete
						checks
					</p>
					<p className="text-sm text-muted-foreground">
						Only counts and fixed blockers are shown. Hosts, paths, config names/values and database
						identifiers are excluded.
					</p>
					<ul className="list-disc pl-5 space-y-2 text-sm">
						{preview.blockers.map((blocker) => (
							<li key={blocker}>{blocker}</li>
						))}
					</ul>
					<Button type="button" disabled>
						Sync blocked
					</Button>
				</section>
			)}
			<p className="text-sm text-muted-foreground">
				After a failed check, fix the connection and repeat inventory. Do not overwrite destination
				apps. Keep source writes authoritative until a tested freeze and cutover. After destination
				writes, DNS-only rollback is unsafe: reconcile data first.{" "}
				<Link className="underline" to="/audit">
					View migration events in audit history
				</Link>
				.
			</p>
		</div>
	);
}
