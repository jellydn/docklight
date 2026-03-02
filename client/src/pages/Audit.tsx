import { Fragment, useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { CommandHistorySchema, UserAuditLogResultSchema, type UserAuditLog } from "../lib/schemas.js";

const AuditLogResultSchema = z.object({
	logs: z.array(CommandHistorySchema),
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
});

type AuditLogResult = z.infer<typeof AuditLogResultSchema>;

type ExitCodeFilter = "all" | "success" | "error";

const ITEMS_PER_PAGE = 50;

type AuditTab = "commands" | "users";

export function Audit() {
	const [activeTab, setActiveTab] = useState<AuditTab>("commands");

	// Command history state
	const [commandLogs, setCommandLogs] = useState<AuditLogResult["logs"]>([]);
	const [commandTotal, setCommandTotal] = useState(0);
	const [commandLoading, setCommandLoading] = useState(true);
	const [commandError, setCommandError] = useState<string | null>(null);

	// User audit log state
	const [userLogs, setUserLogs] = useState<UserAuditLog[]>([]);
	const [userTotal, setUserTotal] = useState(0);
	const [userLoading, setUserLoading] = useState(true);
	const [userError, setUserError] = useState<string | null>(null);

	// Command filter state
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [commandFilter, setCommandFilter] = useState("");
	const [exitCodeFilter, setExitCodeFilter] = useState<ExitCodeFilter>("all");

	// User audit log filter state
	const [userStartDate, setUserStartDate] = useState("");
	const [userEndDate, setUserEndDate] = useState("");
	const [userIdFilter, setUserIdFilter] = useState("");
	const [actionFilter, setActionFilter] = useState("");

	// Pagination state
	const [commandOffset, setCommandOffset] = useState(0);
	const [userOffset, setUserOffset] = useState(0);

	// Expanded rows for details
	const [expandedCommandRows, setExpandedCommandRows] = useState<Set<number>>(new Set());
	const [expandedUserRows, setExpandedUserRows] = useState<Set<number>>(new Set());

	// Fetch command logs when command tab is active or filters change
	useEffect(() => {
		if (activeTab === "commands") {
			fetchCommandLogs();
		}
	}, [commandOffset, startDate, endDate, commandFilter, exitCodeFilter]);

	// Fetch user logs when user tab is active or filters change
	useEffect(() => {
		if (activeTab === "users") {
			fetchUserLogs();
		}
	}, [userOffset, userStartDate, userEndDate, userIdFilter, actionFilter]);

	const fetchCommandLogs = async () => {
		setCommandLoading(true);
		setCommandError(null);

		try {
			const params = new URLSearchParams({
				limit: ITEMS_PER_PAGE.toString(),
				offset: commandOffset.toString(),
			});

			if (startDate) params.append("startDate", startDate);
			if (endDate) params.append("endDate", endDate);
			if (commandFilter) params.append("command", commandFilter);
			params.append("exitCode", exitCodeFilter);

			const result = await apiFetch(`/audit/logs?${params.toString()}`, AuditLogResultSchema);
			setCommandLogs(result.logs);
			setCommandTotal(result.total);
		} catch (err) {
			setCommandError(err instanceof Error ? err.message : "Failed to fetch audit logs");
		} finally {
			setCommandLoading(false);
		}
	};

	const fetchUserLogs = async () => {
		setUserLoading(true);
		setUserError(null);

		try {
			const params = new URLSearchParams({
				limit: ITEMS_PER_PAGE.toString(),
				offset: userOffset.toString(),
			});

			if (userStartDate) params.append("startDate", userStartDate);
			if (userEndDate) params.append("endDate", userEndDate);
			if (userIdFilter) params.append("userId", userIdFilter);
			if (actionFilter) params.append("action", actionFilter);

			const result = await apiFetch(
				`/audit/user-logs?${params.toString()}`,
				UserAuditLogResultSchema
			);
			setUserLogs(result.logs);
			setUserTotal(result.total);
		} catch (err) {
			setUserError(err instanceof Error ? err.message : "Failed to fetch user audit logs");
		} finally {
			setUserLoading(false);
		}
	};

	const handleResetCommandFilters = () => {
		setStartDate("");
		setEndDate("");
		setCommandFilter("");
		setExitCodeFilter("all");
		setCommandOffset(0);
	};

	const handleResetUserFilters = () => {
		setUserStartDate("");
		setUserEndDate("");
		setUserIdFilter("");
		setActionFilter("");
		setUserOffset(0);
	};

	const toggleCommandRowExpansion = (id: number) => {
		setExpandedCommandRows((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	const toggleUserRowExpansion = (id: number) => {
		setExpandedUserRows((prev) => {
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
		const color = exitCode === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
				{exitCode === 0 ? "Success" : `Error (${exitCode})`}
			</span>
		);
	};

	const getActionBadge = (action: string) => {
		const colorMap: Record<string, string> = {
			create: "bg-blue-100 text-blue-800",
			update: "bg-yellow-100 text-yellow-800",
			delete: "bg-red-100 text-red-800",
			login: "bg-green-100 text-green-800",
			logout: "bg-gray-100 text-gray-800",
			deploy: "bg-purple-100 text-purple-800",
		};
		const color = colorMap[action] || "bg-gray-100 text-gray-800";
		return (
			<span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
				{action}
			</span>
		);
	};

	const commandTotalPages = Math.ceil(commandTotal / ITEMS_PER_PAGE);
	const commandCurrentPage = Math.floor(commandOffset / ITEMS_PER_PAGE) + 1;

	const userTotalPages = Math.ceil(userTotal / ITEMS_PER_PAGE);
	const userCurrentPage = Math.floor(userOffset / ITEMS_PER_PAGE) + 1;

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

			{/* Tabs */}
			<div className="border-b border-gray-200 mb-6">
				<nav className="-mb-px flex space-x-8">
					<button
						onClick={() => setActiveTab("commands")}
						className={`${
							activeTab === "commands"
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
					>
						Command History
					</button>
					<button
						onClick={() => setActiveTab("users")}
						className={`${
							activeTab === "users"
								? "border-blue-500 text-blue-600"
								: "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
						} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
					>
						User Actions
					</button>
				</nav>
			</div>

			{activeTab === "commands" ? (
				<>
					{/* Command Filters */}
					<div className="bg-white rounded-lg shadow p-6 mb-6">
						<h2 className="text-lg font-semibold mb-4">Filters</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
							<div>
								<label
									htmlFor="startDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Start Date
								</label>
								<input
									id="startDate"
									type="datetime-local"
									value={startDate}
									onChange={(e) => {
										setStartDate(e.target.value);
										setCommandOffset(0);
									}}
									className="w-full border rounded px-3 py-2"
								/>
							</div>
							<div>
								<label
									htmlFor="endDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									End Date
								</label>
								<input
									id="endDate"
									type="datetime-local"
									value={endDate}
									onChange={(e) => {
										setEndDate(e.target.value);
										setCommandOffset(0);
									}}
									className="w-full border rounded px-3 py-2"
								/>
							</div>
							<div>
								<label
									htmlFor="command"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Command Search
								</label>
								<input
									id="command"
									type="text"
									placeholder="Search commands..."
									value={commandFilter}
									onChange={(e) => {
										setCommandFilter(e.target.value);
										setCommandOffset(0);
									}}
									className="w-full border rounded px-3 py-2"
								/>
							</div>
							<div>
								<label
									htmlFor="exitCode"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Exit Code
								</label>
								<select
									id="exitCode"
									value={exitCodeFilter}
									onChange={(e) => {
										setExitCodeFilter(e.target.value as ExitCodeFilter);
										setCommandOffset(0);
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
								onClick={handleResetCommandFilters}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Reset Filters
							</button>
							<span className="text-sm text-gray-600">
								{commandTotal} {commandTotal === 1 ? "log" : "logs"} found
							</span>
						</div>
					</div>

					{/* Command Logs Table */}
					{commandLoading ? (
						<div className="flex justify-center items-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						</div>
					) : commandError ? (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							{commandError}
						</div>
					) : commandLogs.length === 0 ? (
						<div className="bg-white rounded-lg shadow p-6">
							<p className="text-gray-500">
								No audit logs found matching your filters.
							</p>
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
										{commandLogs.map((log) => (
											<Fragment key={log.id}>
												<tr className="hover:bg-gray-50">
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
															onClick={() => toggleCommandRowExpansion(log.id)}
															className="text-blue-600 hover:text-blue-800"
														>
															{expandedCommandRows.has(log.id)
																? "Hide Details"
																: "View Details"}
														</button>
													</td>
												</tr>
												{expandedCommandRows.has(log.id) && (
													<tr className="bg-gray-50">
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
																		<p className="text-gray-400 text-sm">
																			No output
																		</p>
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
																		<p className="text-gray-400 text-sm">
																			No errors
																		</p>
																	)}
																</div>
															</div>
														</td>
													</tr>
												)}
											</Fragment>
										))}
									</tbody>
								</table>
							</div>

							{/* Command Pagination */}
							{commandTotalPages > 1 && (
								<div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
									<div className="flex-1 flex justify-between sm:hidden">
										<button
											onClick={() =>
												setCommandOffset(Math.max(0, commandOffset - ITEMS_PER_PAGE))
											}
											disabled={commandOffset === 0}
											className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
										>
											Previous
										</button>
										<button
											onClick={() =>
												setCommandOffset(commandOffset + ITEMS_PER_PAGE)
											}
											disabled={commandOffset + ITEMS_PER_PAGE >= commandTotal}
											className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
										>
											Next
										</button>
									</div>
									<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
										<div>
											<p className="text-sm text-gray-700">
												Showing{" "}
												<span className="font-medium">{commandOffset + 1}</span> to{" "}
												<span className="font-medium">
													{Math.min(commandOffset + ITEMS_PER_PAGE, commandTotal)}
												</span>{" "}
												of <span className="font-medium">{commandTotal}</span> results
											</p>
										</div>
										<div>
											<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
												<button
													onClick={() =>
														setCommandOffset(
															Math.max(0, commandOffset - ITEMS_PER_PAGE)
														)
													}
													disabled={commandOffset === 0}
													className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
												>
													Previous
												</button>
												<span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
													Page {commandCurrentPage} of {commandTotalPages}
												</span>
												<button
													onClick={() =>
														setCommandOffset(commandOffset + ITEMS_PER_PAGE)
													}
													disabled={commandOffset + ITEMS_PER_PAGE >= commandTotal}
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
				</>
			) : (
				<>
					{/* User Audit Log Filters */}
					<div className="bg-white rounded-lg shadow p-6 mb-6">
						<h2 className="text-lg font-semibold mb-4">Filters</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
							<div>
								<label
									htmlFor="userStartDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Start Date
								</label>
								<input
									id="userStartDate"
									type="datetime-local"
									value={userStartDate}
									onChange={(e) => {
										setUserStartDate(e.target.value);
										setUserOffset(0);
									}}
									className="w-full border rounded px-3 py-2"
								/>
							</div>
							<div>
								<label
									htmlFor="userEndDate"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									End Date
								</label>
								<input
									id="userEndDate"
									type="datetime-local"
									value={userEndDate}
									onChange={(e) => {
										setUserEndDate(e.target.value);
										setUserOffset(0);
									}}
									className="w-full border rounded px-3 py-2"
								/>
							</div>
							<div>
								<label
									htmlFor="userId"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									User ID
								</label>
								<input
									id="userId"
									type="text"
									placeholder="Filter by user ID..."
									value={userIdFilter}
									onChange={(e) => {
										setUserIdFilter(e.target.value);
										setUserOffset(0);
									}}
									className="w-full border rounded px-3 py-2"
								/>
							</div>
							<div>
								<label
									htmlFor="action"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Action
								</label>
								<input
									id="action"
									type="text"
									placeholder="Filter by action..."
									value={actionFilter}
									onChange={(e) => {
										setActionFilter(e.target.value);
										setUserOffset(0);
									}}
									className="w-full border rounded px-3 py-2"
								/>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								onClick={handleResetUserFilters}
								className="px-4 py-2 border rounded hover:bg-gray-100"
							>
								Reset Filters
							</button>
							<span className="text-sm text-gray-600">
								{userTotal} {userTotal === 1 ? "log" : "logs"} found
							</span>
						</div>
					</div>

					{/* User Audit Logs Table */}
					{userLoading ? (
						<div className="flex justify-center items-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
						</div>
					) : userError ? (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
							{userError}
						</div>
					) : userLogs.length === 0 ? (
						<div className="bg-white rounded-lg shadow p-6">
							<p className="text-gray-500">
								No user audit logs found matching your filters.
							</p>
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
												User ID
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Action
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Resource
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												IP Address
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{userLogs.map((log) => (
											<Fragment key={log.id}>
												<tr className="hover:bg-gray-50">
													<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
														{formatTimestamp(log.createdAt)}
													</td>
													<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
														{log.userId ?? "N/A"}
													</td>
													<td className="px-4 py-3 whitespace-nowrap">
														{getActionBadge(log.action)}
													</td>
													<td className="px-4 py-3 text-sm text-gray-900">
														{log.resource ?? "N/A"}
													</td>
													<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
														{log.ipAddress ?? "N/A"}
													</td>
													<td className="px-4 py-3 whitespace-nowrap text-sm">
														<button
															onClick={() => toggleUserRowExpansion(log.id)}
															className="text-blue-600 hover:text-blue-800"
														>
															{expandedUserRows.has(log.id)
																? "Hide Details"
																: "View Details"}
														</button>
													</td>
												</tr>
												{expandedUserRows.has(log.id) && (
													<tr className="bg-gray-50">
														<td colSpan={6} className="px-4 py-4">
															<div className="space-y-3">
																<div>
																	<h4 className="text-sm font-medium text-gray-700 mb-1">
																		Details
																	</h4>
																	{log.details ? (
																		<pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
																			{log.details}
																		</pre>
																	) : (
																		<p className="text-gray-400 text-sm">
																			No details
																		</p>
																	)}
																</div>
															</div>
														</td>
													</tr>
												)}
											</Fragment>
										))}
									</tbody>
								</table>
							</div>

							{/* User Pagination */}
							{userTotalPages > 1 && (
								<div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
									<div className="flex-1 flex justify-between sm:hidden">
										<button
											onClick={() =>
												setUserOffset(Math.max(0, userOffset - ITEMS_PER_PAGE))
											}
											disabled={userOffset === 0}
											className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
										>
											Previous
										</button>
										<button
											onClick={() => setUserOffset(userOffset + ITEMS_PER_PAGE)}
											disabled={userOffset + ITEMS_PER_PAGE >= userTotal}
											className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
										>
											Next
										</button>
									</div>
									<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
										<div>
											<p className="text-sm text-gray-700">
												Showing{" "}
												<span className="font-medium">{userOffset + 1}</span> to{" "}
												<span className="font-medium">
													{Math.min(userOffset + ITEMS_PER_PAGE, userTotal)}
												</span>{" "}
												of <span className="font-medium">{userTotal}</span> results
											</p>
										</div>
										<div>
											<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
												<button
													onClick={() =>
														setUserOffset(
															Math.max(0, userOffset - ITEMS_PER_PAGE)
														)
													}
													disabled={userOffset === 0}
													className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
												>
													Previous
												</button>
												<span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
													Page {userCurrentPage} of {userTotalPages}
												</span>
												<button
													onClick={() => setUserOffset(userOffset + ITEMS_PER_PAGE)}
													disabled={userOffset + ITEMS_PER_PAGE >= userTotal}
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
				</>
			)}
		</div>
	);
}
