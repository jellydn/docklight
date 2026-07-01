import type { ChecksReport } from "@/lib/schemas.js";
import { alertBannerClass } from "@/lib/status-styles.js";

interface AppChecksProps {
	checksReport: ChecksReport | null;
	loading: boolean;
	error: string | null;
	canModify: boolean;
	enabling: boolean;
	disabling: boolean;
	skipping: boolean;
	running: boolean;
	onEnable: () => void;
	onDisable: () => void;
	onSkip: () => void;
	onRun: () => void;
}

function StatusBanner({ report }: { report: ChecksReport }) {
	const disabled = report.disabled;
	const skipped = report.skipped;

	if (disabled) {
		return (
			<div className={`flex items-center gap-2 ${alertBannerClass("warning")}`}>
				<span className="text-warning text-lg">⚠</span>
				<div>
					<p className="text-sm font-medium">Zero-downtime deploys are disabled</p>
					<p className="text-xs opacity-80">
						Old containers will be stopped before new ones start, which may cause downtime.
					</p>
				</div>
			</div>
		);
	}
	if (skipped) {
		return (
			<div className={`flex items-center gap-2 ${alertBannerClass("warning")}`}>
				<span className="text-warning text-lg">⏭</span>
				<div>
					<p className="text-sm font-medium">Checks are being skipped</p>
					<p className="text-xs opacity-80">
						The default wait period and custom checks will not run on the next deploy.
					</p>
				</div>
			</div>
		);
	}
	return (
		<div className={`flex items-center gap-2 ${alertBannerClass("success")}`}>
			<span className="text-success text-lg">✓</span>
			<div>
				<p className="text-sm font-medium">Zero-downtime deploys are active</p>
				<p className="text-xs opacity-80">
					Dokku will verify containers are responding before switching traffic.
				</p>
			</div>
		</div>
	);
}

export function AppChecks({
	checksReport,
	loading,
	error,
	canModify,
	enabling,
	disabling,
	skipping,
	running,
	onEnable,
	onDisable,
	onSkip,
	onRun,
}: AppChecksProps) {
	const isEnabled = checksReport ? !checksReport.disabled : false;
	const isSkipAll = checksReport ? checksReport.skipped : false;

	return (
		<div className="space-y-6">
			<div className="bg-card rounded-lg border border-border p-6">
				<h2 className="text-lg font-semibold mb-4">Zero-Downtime Checks</h2>

				{loading ? (
					<div className="flex justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tertiary" />
					</div>
				) : error ? (
					<div className={alertBannerClass("error")}>
						<p>{error}</p>
					</div>
				) : checksReport ? (
					<StatusBanner report={checksReport} />
				) : null}
			</div>

			{canModify && (
				<div className="bg-card rounded-lg border border-border p-6">
					<h2 className="text-lg font-semibold mb-4">Manage Checks</h2>
					<div className="space-y-4">
						<div className="flex items-start gap-4 pb-4 border-b border-border">
							<div className="flex-1">
								<p className="text-sm font-medium text-foreground">Deploy Checks</p>
								<p className="text-sm text-muted-foreground">
									{isEnabled
										? "Checks are enabled. Dokku waits for the app to respond before completing deploys."
										: "Checks are disabled. Old containers stop before new ones start, risking downtime."}
								</p>
							</div>
							{isEnabled ? (
								<button
									type="button"
									onClick={onDisable}
									disabled={disabling}
									className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
								>
									{disabling ? "Disabling..." : "Disable"}
								</button>
							) : (
								<button
									type="button"
									onClick={onEnable}
									disabled={enabling}
									className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
								>
									{enabling ? "Enabling..." : "Enable"}
								</button>
							)}
						</div>

						<div className="flex items-start gap-4 pb-4 border-b border-border">
							<div className="flex-1">
								<p className="text-sm font-medium text-foreground">Skip Checks</p>
								<p className="text-sm text-muted-foreground">
									Skip the default wait period and custom checks for the next deploy.
								</p>
							</div>
							<button
								type="button"
								onClick={onSkip}
								disabled={skipping || isSkipAll}
								className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
							>
								{skipping ? "Skipping..." : "Skip"}
							</button>
						</div>

						<div className="flex items-start gap-4">
							<div className="flex-1">
								<p className="text-sm font-medium text-foreground">Run Checks</p>
								<p className="text-sm text-muted-foreground">
									Manually run health checks against the live app containers.
								</p>
							</div>
							<button
								type="button"
								onClick={onRun}
								disabled={running}
								className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
							>
								{running ? "Running..." : "Run"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
