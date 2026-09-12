import type { AppDetailHeaderProps } from "./types.js";
import { statusBadgeClass } from "@/lib/status-styles.js";

export function AppDetailHeader({
	appName,
	status,
	canModify,
	onStop,
	onStart,
	onRestart,
	onRebuild,
}: AppDetailHeaderProps) {
	return (
		<div className="page-header items-start sm:items-center">
			<div className="min-w-0">
				<h1 className="page-title break-all">{appName}</h1>
				<div className="mt-2">
					<span className={statusBadgeClass(status)}>{status}</span>
				</div>
			</div>
			{canModify && (
				<div className="flex flex-wrap gap-2 w-full sm:w-auto">
					{status === "running" && (
						<button
							onClick={onStop}
							className="bg-warning text-warning-foreground px-4 py-2 rounded hover:bg-warning/90"
							type="button"
						>
							Stop
						</button>
					)}
					{status === "stopped" && (
						<button
							onClick={onStart}
							className="bg-success text-success-foreground px-4 py-2 rounded hover:bg-success/90"
							type="button"
						>
							Start
						</button>
					)}
					<button
						onClick={onRestart}
						className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90"
						type="button"
					>
						Restart
					</button>
					<button
						onClick={onRebuild}
						className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/80"
						type="button"
					>
						Rebuild
					</button>
				</div>
			)}
		</div>
	);
}
