import type { AppDetail as AppDetailData } from "../../lib/schemas.js";
import type { CopySuccess } from "./types.js";

interface AppOverviewProps {
	app: AppDetailData;
	hostname: string;
	copySuccess: CopySuccess;
	scaleChanges: Record<string, number>;
	onCopyRemote: () => void;
	onCopyPush: () => void;
	onScaleChange: (processType: string, count: number, currentCount: number) => void;
	onApplyScale: () => void;
	onDeleteApp: () => void;
}

export function AppOverview({
	app,
	hostname,
	copySuccess,
	scaleChanges,
	onCopyRemote,
	onCopyPush,
	onScaleChange,
	onApplyScale,
	onDeleteApp,
}: AppOverviewProps) {
	const getStatusBadge = () => {
		const color =
			app.status === "running" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
		return (
			<span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>{app.status}</span>
		);
	};

	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Overview</h2>
			<div className="space-y-4">
				<div>
					<strong className="text-gray-700">Status:</strong> {getStatusBadge()}
				</div>
				<div>
					<strong className="text-gray-700">Git Remote:</strong>{" "}
					<code className="bg-gray-100 px-2 py-1 rounded text-sm">{app.gitRemote || "-"}</code>
				</div>
				<div className="mt-4 p-4 bg-gray-50 rounded-lg border">
					<p className="text-sm font-medium mb-3 text-gray-900">Manual Deployment</p>
					<div className="space-y-3 text-sm">
						<div>
							<p className="text-gray-600 mb-1">1. Add the Dokku remote:</p>
							<div className="flex items-center gap-2">
								<code className="flex-1 bg-white px-3 py-2 rounded border text-xs break-all font-mono">
									git remote add dokku dokku@{hostname}:{app.name}
								</code>
								<button
									type="button"
									onClick={onCopyRemote}
									className="text-blue-600 hover:text-blue-800 text-xs whitespace-nowrap px-2 py-1 rounded hover:bg-blue-50 transition-colors"
									title="Copy to clipboard"
								>
									{copySuccess.remote ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
						<div>
							<p className="text-gray-600 mb-1">2. Push your code:</p>
							<div className="flex items-center gap-2">
								<code className="flex-1 bg-white px-3 py-2 rounded border text-xs font-mono">
									git push dokku main
								</code>
								<button
									type="button"
									onClick={onCopyPush}
									className="text-blue-600 hover:text-blue-800 text-xs whitespace-nowrap px-2 py-1 rounded hover:bg-blue-50 transition-colors"
									title="Copy to clipboard"
								>
									{copySuccess.push ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
					</div>
				</div>
				<div>
					<strong className="text-gray-700">Domains:</strong>
					{app.domains.length > 0 ? (
						<ul className="list-disc list-inside ml-4">
							{app.domains.map((domain) => (
								<li key={domain}>{domain}</li>
							))}
						</ul>
					) : (
						<span className="text-gray-400">No domains</span>
					)}
				</div>
				<div>
					<strong className="text-gray-700">Processes:</strong>
					{Object.keys(app.processes).length > 0 ? (
						<div className="mt-4">
							<div className="space-y-3">
								{Object.entries(app.processes).map(([type, count]) => (
									<div key={type} className="flex items-center space-x-4">
										<div className="w-32 font-medium">{type}</div>
										<div className="flex items-center space-x-2">
											<span className="text-gray-600">Current:</span>
											<span className="font-mono">{count}</span>
										</div>
										<div className="flex items-center space-x-2">
											<span className="text-gray-600">Scale to:</span>
											<input
												type="number"
												min="0"
												max="100"
												defaultValue={count}
												onChange={(e) =>
													onScaleChange(type, parseInt(e.target.value, 10), count)
												}
												className="w-20 border rounded px-2 py-1"
											/>
										</div>
									</div>
								))}
							</div>
							{Object.keys(scaleChanges).length > 0 && (
								<div className="mt-4">
									<button
										onClick={onApplyScale}
										className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
										type="button"
									>
										Apply Scaling
									</button>
								</div>
							)}
						</div>
					) : (
						<span className="text-gray-400">No processes running</span>
					)}
				</div>

				<div className="mt-8 pt-6 border-t border-red-200">
					<div className="border border-red-300 rounded-lg p-4 bg-red-50">
						<h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
						<p className="text-sm text-red-600 mb-4">
							Deleting an app is irreversible. All data, logs, and configurations will be
							permanently removed.
						</p>
						<button
							onClick={onDeleteApp}
							className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
							type="button"
						>
							Delete App
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
