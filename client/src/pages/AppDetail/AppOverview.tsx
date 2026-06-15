import type { AppDetail as AppDetailData } from "../../lib/schemas.js";
import type { CopySuccess } from "./types.js";

interface AppOverviewProps {
	app: AppDetailData;
	hostname: string;
	copySuccess: CopySuccess;
	scaleChanges: Record<string, number>;
	canModify: boolean;
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
	canModify,
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
		<div className="bg-card rounded-lg border border-border p-6">
			<h2 className="text-lg font-semibold mb-4">Overview</h2>
			<div className="space-y-4">
				<div>
					<strong className="text-foreground">Status:</strong> {getStatusBadge()}
				</div>
				<div>
					<strong className="text-foreground">Git Remote:</strong>{" "}
					<code className="bg-muted px-2 py-1 rounded text-sm">{app.gitRemote || "-"}</code>
				</div>
				<div className="mt-4 p-4 bg-muted/50 rounded-lg border">
					<p className="text-sm font-medium mb-3 text-foreground">Manual Deployment</p>
					<div className="space-y-3 text-sm">
						<div>
							<p className="text-muted-foreground mb-1">1. Add the Dokku remote:</p>
							<div className="flex items-center gap-2">
								<code className="flex-1 bg-card px-3 py-2 rounded border text-xs break-all font-mono">
									git remote add dokku dokku@{hostname}:{app.name}
								</code>
								<button
									type="button"
									onClick={onCopyRemote}
									className="text-primary hover:text-primary text-xs whitespace-nowrap px-2 py-1 rounded hover:bg-primary/10 transition-colors"
									title="Copy to clipboard"
								>
									{copySuccess.remote ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
						<div>
							<p className="text-muted-foreground mb-1">2. Push your code:</p>
							<div className="flex items-center gap-2">
								<code className="flex-1 bg-card px-3 py-2 rounded border text-xs font-mono">
									git push dokku main
								</code>
								<button
									type="button"
									onClick={onCopyPush}
									className="text-primary hover:text-primary text-xs whitespace-nowrap px-2 py-1 rounded hover:bg-primary/10 transition-colors"
									title="Copy to clipboard"
								>
									{copySuccess.push ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
					</div>
				</div>
				<div>
					<strong className="text-foreground">Domains:</strong>
					{app.domains.length > 0 ? (
						<ul className="list-disc list-inside ml-4">
							{app.domains.map((domain) => (
								<li key={domain}>{domain}</li>
							))}
						</ul>
					) : (
						<span className="text-muted-foreground/60">No domains</span>
					)}
				</div>
				<div>
					<strong className="text-foreground">Processes:</strong>
					{Object.keys(app.processes).length > 0 ? (
						<div className="mt-4">
							<div className="space-y-3">
								{Object.entries(app.processes).map(([type, count]) => (
									<div key={type} className="flex items-center space-x-4">
										<div className="w-32 font-medium">{type}</div>
										<div className="flex items-center space-x-2">
											<span className="text-muted-foreground">Current:</span>
											<span className="font-mono">{count}</span>
										</div>
										{canModify && app.canScale && (
											<div className="flex items-center space-x-2">
												<span className="text-muted-foreground">Scale to:</span>
												<input
													type="number"
													min="0"
													max="100"
													defaultValue={count}
													onChange={(e) => onScaleChange(type, parseInt(e.target.value, 10), count)}
													className="w-20 border rounded px-2 py-1"
													aria-label={`Scale ${type}`}
												/>
											</div>
										)}
									</div>
								))}
							</div>
							{canModify && app.canScale && Object.keys(scaleChanges).length > 0 && (
								<div className="mt-4">
									<button
										onClick={onApplyScale}
										className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
										type="button"
									>
										Apply Scaling
									</button>
								</div>
							)}
						</div>
					) : (
						<span className="text-muted-foreground/60">No processes running</span>
					)}
				</div>

				{canModify && (
					<div className="mt-8 pt-6 border-t border-red-200">
						<div className="border border-red-300 rounded-lg p-4 bg-red-50">
							<h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
							<p className="text-sm text-red-600 mb-4">
								Deleting an app is irreversible. All data, logs, and configurations will be
								permanently removed.
							</p>
							<button
								onClick={onDeleteApp}
								className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90"
								type="button"
							>
								Delete App
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
