import type { RefObject } from "react";

type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

interface AppLogsProps {
	logs: string[];
	connectionStatus: ConnectionStatus;
	lineCount: number;
	autoScroll: boolean;
	logsEndRef: RefObject<HTMLPreElement | null>;
	onLineCountChange: (count: number) => void;
	onAutoScrollToggle: () => void;
}

export function AppLogs({
	logs,
	connectionStatus,
	lineCount,
	autoScroll,
	logsEndRef,
	onLineCountChange,
	onAutoScrollToggle,
}: AppLogsProps) {
	const getConnectionStatusBadge = () => {
		const colors = {
			connected: "bg-green-100 text-green-800",
			disconnected: "bg-gray-100 text-gray-800",
			reconnecting: "bg-yellow-100 text-yellow-800",
		};
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[connectionStatus]}`}>
				{connectionStatus}
			</span>
		);
	};

	return (
		<div className="bg-white rounded-lg shadow p-6">
			<div className="flex flex-wrap gap-3 justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">Logs</h2>
				<div className="flex flex-wrap items-center gap-3">
					{getConnectionStatusBadge()}
					<select
						value={lineCount}
						onChange={(e) => onLineCountChange(parseInt(e.target.value, 10))}
						className="border rounded px-2 py-1"
					>
						<option value={100}>100 lines</option>
						<option value={500}>500 lines</option>
						<option value={1000}>1000 lines</option>
					</select>
					<button
						onClick={onAutoScrollToggle}
						className="px-3 py-1 border rounded hover:bg-gray-100"
						type="button"
					>
						{autoScroll ? "Auto-scroll: ON" : "Auto-scroll: OFF"}
					</button>
				</div>
			</div>
			<div className="bg-gray-900 rounded p-4 h-96 overflow-y-auto">
				<pre ref={logsEndRef} className="text-green-400 font-mono text-sm whitespace-pre-wrap">
					{(() => {
						if (logs.length > 0) return logs.join("\n");
						if (connectionStatus === "connected") return "Waiting for logs...";
						return "Not connected";
					})()}
				</pre>
			</div>
		</div>
	);
}
