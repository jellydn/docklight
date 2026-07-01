import { badgeClass } from "@/lib/status-styles.js";
import { cn } from "@/lib/utils";
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
		if (connectionStatus === "connected") {
			return <span className={badgeClass("success")}>{connectionStatus}</span>;
		}
		if (connectionStatus === "reconnecting") {
			return <span className={badgeClass("warning")}>{connectionStatus}</span>;
		}
		return (
			<span
				className={cn(
					"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
					"bg-muted text-muted-foreground"
				)}
			>
				{connectionStatus}
			</span>
		);
	};

	return (
		<div className="bg-card rounded-lg border border-border p-6">
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
						className="px-3 py-1 border rounded hover:bg-accent"
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
