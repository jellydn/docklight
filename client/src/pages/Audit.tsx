import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { CommandHistorySchema } from "../lib/schemas.js";

const AuditLogResultSchema = z.object({
	logs: z.array(CommandHistorySchema),
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
});

type AuditLogResult = z.infer<typeof AuditLogResultSchema>;

type ExitCodeFilter = "all" | "success" | "error";

const ITEMS_PER_PAGE = 50;

export function Audit() {
	const [logs, setLogs] = useState<AuditLogResult["logs"]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filter state
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [commandFilter, setCommandFilter] = useState("");
	const [exitCodeFilter, setExitCodeFilter] = useState<ExitCodeFilter>("all");

	// Pagination state
	const [offset, setOffset] = useState(0);

	// Expanded rows for details
	const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

	useEffect(() => {
		fetchLogs();
	}, [offset, startDate, endDate, commandFilter, exitCodeFilter]);

	const fetchLogs = async () => {
		setLoading(true);
		setError(null);

		try {
			const params = new URLSearchParams({
				limit: ITEMS_PER_PAGE.toString(),
				offset: offset.toString(),
			});

			if (startDate) params.append("startDate", startDate);
			if (endDate) params.append("endDate", endDate);
			if (commandFilter) params.append("command", commandFilter);
			params.append("exitCode", exitCodeFilter);

			const result = await apiFetch(`/audit/logs?${params.toString()}`, AuditLogResultSchema);
			setLogs(result.logs);
			setTotal(result.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch audit logs");
		} finally {
			setLoading(false);
		}
	};

	const handleResetFilters = () => {
		setStartDate("");
		setEndDate("");
		setCommandFilter("");
		setExitCodeFilter("all");
		setOffset(0);
	};

	const toggleRowExpansion = (id: number) => {
		setExpandedRows((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	const formatTimestamp = (dateString: string) => {
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) {
			return "Invalid date";
		}
		return date.toLocaleString();
	};

	const getExitCodeBadge = (exitCode: number) => {
		const color =
			exitCode === 0
				? "bg-green-100 text-green-800"
				: "bg-red-100 text-red-800";
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
				{exitCode === 0 ? "Success" : `Error (${exitCode})`}
			</span>
		);
	};

	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

			{/* Filters */}
			<div className="bg-white rounded-lg shadow p-6 mb-6">
				<h2 className="text-lg font-semibold mb-4">Filters</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
					<div>
						<label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
							Start Date
						</label>
						<input
							id="startDate"
							type="datetime-local"
							value={startDate}
							onChange={(e) => {
								setStartDate(e.target.value);
								setOffset(0);
							}}
							className="w-full border rounded px-3 py-2"
						/>
					</div>
					<div>
						<label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
							End Date
						</label>
						<input
							id="endDate"
							type="datetime-local"
							value={endDate}
							onChange={(e) => {
								setEndDate(e.target.value);
								setOffset(0);
							}}
							className="w-full border rounded px-3 py-2"
						/>
					</div>
					<div>
						<label htmlFor="command" className="block text-sm font-medium text-gray-700 mb-1">
							Command Search
						</label>
						<input
							id="command"
							type="text"
							placeholder="Search commands..."
							value={commandFilter}
							onChange={(e) => {
								setCommandFilter(e.target.value);
								setOffset(0);
							}}
							className="w-full border rounded px-3 py-2"
						/>
					</div>
					<div>
						<label htmlFor="exitCode" className="block text-sm font-medium text-gray-700 mb-1">
							Exit Code
						</label>
						<select
							id="exitCode"
							value={exitCodeFilter}
							onChange={(e) => {
								setExitCodeFilter(e.target.value as ExitCodeFilter);
								setOffset(0);
							}}
							className="w-full border rounded px-3 py-2"
						>
							<option value="all">All</option>
							<option value="success">Success Only</option>
							<option value="error">Errors Only</option>
						</select>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={handleResetFilters}
						className="px-4 py-2 border rounded hover:bg-gray-100"
					>
						Reset Filters
					</button>
					<span className="text-sm text-gray-600">
						{total} {total === 1 ? "log" : "logs"} found
					</span>
				</div>
			</div>

			{/* Logs Table */}
			{loading ? (
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : logs.length === 0 ? (
				<div className="bg-white rounded-lg shadow p-6">
					<p className="text-gray-500">No audit logs found matching your filters.</p>
				</div>
			) : (
				<div className="bg-white rounded-lg shadow overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Timestamp
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Command
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Exit Code
									</th>
									<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{logs.map((log) => (
									<>
										<tr key={log.id} className="hover:bg-gray-50">
											<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
												{formatTimestamp(log.createdAt)}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900">
												<code className="bg-gray-100 px-2 py-1 rounded text-xs max-w-md block truncate">
													{log.command}
												</code>
											</td>
											<td className="px-4 py-3 whitespace-nowrap">
												{getExitCodeBadge(log.exitCode)}
											</td>
											<td className="px-4 py-3 whitespace-nowrap text-sm">
												<button
													onClick={() => toggleRowExpansion(log.id)}
													className="text-blue-600 hover:text-blue-800"
												>
													{expandedRows.has(log.id) ? "Hide Details" : "View Details"}
												</button>
											</td>
										</tr>
										{expandedRows.has(log.id) && (
											<tr key={`${log.id}-details`} className="bg-gray-50">
												<td colSpan={4} className="px-4 py-4">
													<div className="space-y-3">
														<div>
															<h4 className="text-sm font-medium text-gray-700 mb-1">
																Stdout
															</h4>
															{log.stdout ? (
																<pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
																	{log.stdout}
																</pre>
															) : (
																<p className="text-gray-400 text-sm">No output</p>
															)}
														</div>
														<div>
															<h4 className="text-sm font-medium text-gray-700 mb-1">
																Stderr
															</h4>
															{log.stderr ? (
																<pre className="bg-gray-900 text-red-400 p-3 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
																	{log.stderr}
																</pre>
															) : (
																<p className="text-gray-400 text-sm">No errors</p>
															)}
														</div>
													</div>
												</td>
											</tr>
										)}
									</>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
							<div className="flex-1 flex justify-between sm:hidden">
								<button
									onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
									disabled={offset === 0}
									className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
								>
									Previous
								</button>
								<button
									onClick={() => setOffset(Math.min(total - ITEMS_PER_PAGE, offset + ITEMS_PER_PAGE))}
									disabled={offset + ITEMS_PER_PAGE >= total}
									className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
								>
									Next
								</button>
							</div>
							<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
								<div>
									<p className="text-sm text-gray-700">
										Showing <span className="font-medium">{offset + 1}</span> to{" "}
										<span className="font-medium">{Math.min(offset + ITEMS_PER_PAGE, total)}</span> of{" "}
										<span className="font-medium">{total}</span> results
									</p>
								</div>
								<div>
									<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
										<button
											onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
											disabled={offset === 0}
											className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
										>
											Previous
										</button>
										<span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
											Page {currentPage} of {totalPages}
										</span>
										<button
											onClick={() => setOffset(Math.min(total - ITEMS_PER_PAGE, offset + ITEMS_PER_PAGE))}
											disabled={offset + ITEMS_PER_PAGE >= total}
											className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
										>
											Next
										</button>
									</nav>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
