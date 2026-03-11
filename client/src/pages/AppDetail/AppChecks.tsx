import type { ChecksReport } from "@/lib/schemas.js";

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

function StatusBanner({ enabled, skipped }: { enabled: boolean; skipped: boolean }) {
	if (!enabled) {
		return (
			<div className="flex items-center gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3">
				<span className="text-yellow-600 text-lg">⚠</span>
				<span className="text-sm font-medium text-yellow-800">
					Health checks are disabled — Dokku will not wait for the app to respond during deploys.
				</span>
			</div>
		);
	}
	if (skipped) {
		return (
			<div className="flex items-center gap-2 rounded-md bg-orange-50 border border-orange-200 px-4 py-3">
				<span className="text-orange-600 text-lg">⏭</span>
				<span className="text-sm font-medium text-orange-800">
					Health checks are skipped for the current deploy.
				</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3">
			<span className="text-green-600 text-lg">✓</span>
			<span className="text-sm font-medium text-green-800">
				Health checks are enabled — Dokku will verify the app is responding before completing
				deploys.
			</span>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
			<span className="text-sm text-gray-500">{label}</span>
			<span className="text-sm text-gray-900">{value}</span>
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
	const isEnabled = !(checksReport?.computedDisabled ?? true);
	const isSkipAll = checksReport?.computedSkipAll ?? false;

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold mb-4">Health Checks</h2>

				{loading ? (
					<div className="flex justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
					</div>
				) : error ? (
					<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
						<p>{error}</p>
					</div>
				) : checksReport ? (
					<div className="space-y-4">
						<StatusBanner enabled={isEnabled} skipped={isSkipAll} />

						<div className="mt-4">
							<DetailRow label="Status" value={isEnabled ? "Enabled" : "Disabled"} />
							<DetailRow label="Skip All" value={isSkipAll ? "Yes" : "No"} />
							{checksReport.disabledList && checksReport.disabledList !== "none" && (
								<DetailRow label="Disabled Processes" value={checksReport.disabledList} />
							)}
							{checksReport.skippedList && checksReport.skippedList !== "none" && (
								<DetailRow label="Skipped Processes" value={checksReport.skippedList} />
							)}
							{checksReport.globalDisabled && <DetailRow label="Global Disabled" value="Yes" />}
							{checksReport.globalSkipAll && <DetailRow label="Global Skip All" value="Yes" />}
						</div>
					</div>
				) : null}
			</div>

			{canModify && (
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">Manage Checks</h2>
					<div className="space-y-4">
						<div className="flex items-start gap-4 pb-4 border-b border-gray-100">
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">Deploy Health Checks</p>
								<p className="text-sm text-gray-500">
									Dokku {isEnabled ? "waits" : "does not wait"} for the app to respond before
									completing deploys.
								</p>
							</div>
							{isEnabled ? (
								<button
									type="button"
									onClick={onDisable}
									disabled={disabling}
									className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
								>
									{disabling ? "Disabling..." : "Disable Checks"}
								</button>
							) : (
								<button
									type="button"
									onClick={onEnable}
									disabled={enabling}
									className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
								>
									{enabling ? "Enabling..." : "Enable Checks"}
								</button>
							)}
						</div>

						<div className="flex items-start gap-4 pb-4 border-b border-gray-100">
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">Skip Checks</p>
								<p className="text-sm text-gray-500">
									Skip health checks for the next deploy only.
								</p>
							</div>
							<button
								type="button"
								onClick={onSkip}
								disabled={skipping || isSkipAll}
								className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
							>
								{skipping ? "Skipping..." : "Skip Checks"}
							</button>
						</div>

						<div className="flex items-start gap-4">
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900">Run Checks</p>
								<p className="text-sm text-gray-500">
									Manually run the CHECKS file against the live app.
								</p>
							</div>
							<button
								type="button"
								onClick={onRun}
								disabled={running}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
							>
								{running ? "Running..." : "Run Checks"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
