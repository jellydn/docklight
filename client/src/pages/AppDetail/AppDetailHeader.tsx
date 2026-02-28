import type { AppDetailHeaderProps } from "./types.js";

export function AppDetailHeader({
	appName,
	status,
	onStop,
	onStart,
	onRestart,
	onRebuild,
}: AppDetailHeaderProps) {
	const getStatusBadge = () => {
		const color =
			status === "running" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
		return (
			<span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>{status}</span>
		);
	};

	return (
		<div className="flex flex-wrap gap-3 justify-between items-center mb-6">
			<div>
				<h1 className="text-2xl font-bold">{appName}</h1>
				<div className="mt-2">{getStatusBadge()}</div>
			</div>
			<div className="flex gap-2">
				{status === "running" && (
					<button
						onClick={onStop}
						className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
						type="button"
					>
						Stop
					</button>
				)}
				{status === "stopped" && (
					<button
						onClick={onStart}
						className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
						type="button"
					>
						Start
					</button>
				)}
				<button
					onClick={onRestart}
					className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
					type="button"
				>
					Restart
				</button>
				<button
					onClick={onRebuild}
					className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
					type="button"
				>
					Rebuild
				</button>
			</div>
		</div>
	);
}
