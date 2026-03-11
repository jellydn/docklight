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

function StatusBadge({ active, trueLabel = "Yes", falseLabel = "No" }: { active: boolean; trueLabel?: string; falseLabel?: string }) {
	return active ? (
		<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
			{trueLabel}
		</span>
	) : (
		<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
			{falseLabel}
		</span>
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
	const isDisabled = checksReport?.computedDisabled ?? false;
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
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<span className="text-sm font-medium text-gray-500">Checks Disabled</span>
								<div className="mt-1">
									<StatusBadge active={checksReport.computedDisabled} trueLabel="Disabled" falseLabel="Enabled" />
								</div>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-500">Skip All Checks</span>
								<div className="mt-1">
									<StatusBadge active={checksReport.computedSkipAll} trueLabel="Yes" falseLabel="No" />
								</div>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-500">Disabled Process Types</span>
								<p className="mt-1 text-sm text-gray-700">
									{checksReport.disabledList || "none"}
								</p>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-500">Skipped Process Types</span>
								<p className="mt-1 text-sm text-gray-700">
									{checksReport.skippedList || "none"}
								</p>
							</div>
							{checksReport.computedSkipped && (
								<div>
									<span className="text-sm font-medium text-gray-500">Computed Skipped</span>
									<p className="mt-1 text-sm text-gray-700">{checksReport.computedSkipped}</p>
								</div>
							)}
							<div>
								<span className="text-sm font-medium text-gray-500">Global Disabled</span>
								<div className="mt-1">
									<StatusBadge active={checksReport.globalDisabled} trueLabel="Yes" falseLabel="No" />
								</div>
							</div>
							<div>
								<span className="text-sm font-medium text-gray-500">Global Skip All</span>
								<div className="mt-1">
									<StatusBadge active={checksReport.globalSkipAll} trueLabel="Yes" falseLabel="No" />
								</div>
							</div>
							{checksReport.globalSkipped && (
								<div>
									<span className="text-sm font-medium text-gray-500">Global Skipped</span>
									<p className="mt-1 text-sm text-gray-700">{checksReport.globalSkipped}</p>
								</div>
							)}
						</div>
					</div>
				) : null}
			</div>

			{canModify && (
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold mb-4">Manage Checks</h2>
					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={onEnable}
							disabled={enabling || !isDisabled}
							className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							{enabling ? "Enabling..." : "Enable Checks"}
						</button>
						<button
							type="button"
							onClick={onDisable}
							disabled={disabling || isDisabled}
							className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							{disabling ? "Disabling..." : "Disable Checks"}
						</button>
						<button
							type="button"
							onClick={onSkip}
							disabled={skipping || isSkipAll}
							className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							{skipping ? "Skipping..." : "Skip Checks"}
						</button>
						<button
							type="button"
							onClick={onRun}
							disabled={running}
							className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
						>
							{running ? "Running..." : "Run Checks"}
						</button>
					</div>
					<p className="mt-3 text-sm text-gray-500">
						<strong>Enable/Disable:</strong> controls whether Dokku waits for health checks
						during deployment. <strong>Skip:</strong> skips checks for this deploy only.{" "}
						<strong>Run:</strong> manually triggers the CHECKS file against the live app.
					</p>
				</div>
			)}
		</div>
	);
}
