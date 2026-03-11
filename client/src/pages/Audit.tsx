import { Fragment, useEffect, useState } from "react";
import { z } from "zod";
import { AuditFilters } from "../components/audit-filters.js";
import { AuditPagination } from "../components/audit-pagination.js";
import { useAuth } from "../contexts/auth-context.js";
import { useAuditLogWithFilters } from "../hooks/use-audit-log.js";
import {
	type CommandHistory,
	CommandHistorySchema,
	type UserAuditLog,
	UserAuditLogResultSchema,
} from "../lib/schemas.js";

type ExitCodeFilter = "all" | "success" | "error";
type AuditTab = "commands" | "users";

const AuditLogResultSchema = z.object({
	logs: z.array(CommandHistorySchema),
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
});

type CommandFilters = {
	startDate: string;
	endDate: string;
	command: string;
	exitCode: ExitCodeFilter;
};

type UserFilters = {
	startDate: string;
	endDate: string;
	userId: string;
	action: string;
};

const defaultCommandFilters: CommandFilters = {
	startDate: "",
	endDate: "",
	command: "",
	exitCode: "all",
};

const defaultUserFilters: UserFilters = {
	startDate: "",
	endDate: "",
	userId: "",
	action: "",
};

function AuditLoadingState() {
	return (
		<div className="flex justify-center items-center py-12">
			<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
		</div>
	);
}

function AuditErrorState({ error }: { error: string }) {
	return (
		<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
	);
}

export function Audit() {
	const [activeTab, setActiveTab] = useState<AuditTab>("commands");
	const { role } = useAuth();
	const isAdmin = role === "admin";

	// Command history state
	const {
		logs: commandLogs,
		total: commandTotal,
		loading: commandLoading,
		error: commandError,
		offset: commandOffset,
		setOffset: setCommandOffset,
		filters: commandFilters,
		setFilter: setCommandFilter,
		resetFilters: resetCommandFilters,
	} = useAuditLogWithFilters<CommandHistory, CommandFilters>({
		fetchUrl: "/audit/logs",
		schema: AuditLogResultSchema,
		fetchDeps: [],
	});

	// User audit log state
	const {
		logs: userLogs,
		total: userTotal,
		loading: userLoading,
		error: userError,
		offset: userOffset,
		setOffset: setUserOffset,
		filters: userFilters,
		setFilter: setUserFilter,
		resetFilters: resetUserFilters,
	} = useAuditLogWithFilters<UserAuditLog, UserFilters>({
		fetchUrl: "/audit/user-logs",
		schema: UserAuditLogResultSchema,
		fetchDeps: [],
	});

	useEffect(() => {
		if (Object.keys(commandFilters).length === 0) {
			resetCommandFilters(defaultCommandFilters);
		}
		if (Object.keys(userFilters).length === 0) {
			resetUserFilters(defaultUserFilters);
		}
	}, []);

	// Expanded rows for details
	const [expandedCommandRows, setExpandedCommandRows] = useState<Set<number>>(new Set());
	const [expandedUserRows, setExpandedUserRows] = useState<Set<number>>(new Set());

	const toggleRowExpansion = (id: number, isUserTab: boolean) => {
		const setter = isUserTab ? setExpandedUserRows : setExpandedCommandRows;
		setter((prev) => {
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
		const verb = action.split(":").pop() ?? action;
		const colorMap: Record<string, string> = {
			create: "bg-blue-100 text-blue-800",
			update: "bg-yellow-100 text-yellow-800",
			delete: "bg-red-100 text-red-800",
			login: "bg-green-100 text-green-800",
			logout: "bg-gray-100 text-gray-800",
			deploy: "bg-purple-100 text-purple-800",
		};
		const color = colorMap[verb] || "bg-gray-100 text-gray-800";
		return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{action}</span>;
	};

	const handleExport = (type: "commands" | "users", format: "json" | "csv") => {
		const params = new URLSearchParams({ type, format });
		if (type === "commands") {
			if (commandFilters.startDate) params.set("startDate", commandFilters.startDate);
			if (commandFilters.endDate) params.set("endDate", commandFilters.endDate);
			if (commandFilters.command) params.set("command", commandFilters.command);
			if (commandFilters.exitCode && commandFilters.exitCode !== "all")
				params.set("exitCode", commandFilters.exitCode);
		} else {
			if (userFilters.startDate) params.set("startDate", userFilters.startDate);
			if (userFilters.endDate) params.set("endDate", userFilters.endDate);
			if (userFilters.userId) params.set("userId", userFilters.userId);
			if (userFilters.action) params.set("action", userFilters.action);
		}
		const link = document.createElement("a");
		link.href = `/api/audit/export?${params.toString()}`;
		link.click();
	};

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
						type="button"
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
						type="button"
					>
						User Actions
					</button>
				</nav>
			</div>

			{activeTab === "commands" ? (
				<>
					{/* Command Filters */}
					<AuditFilters
						fields={[
							{ name: "startDate", label: "Start Date", type: "date" },
							{ name: "endDate", label: "End Date", type: "date" },
							{
								name: "command",
								label: "Command Search",
								type: "text",
								placeholder: "Search commands...",
							},
							{
								name: "exitCode",
								label: "Exit Code",
								type: "select",
								options: [
									{ value: "all", label: "All" },
									{ value: "success", label: "Success Only" },
									{ value: "error", label: "Errors Only" },
								],
							},
						]}
						filters={commandFilters}
						onFilterChange={setCommandFilter}
						onReset={() => resetCommandFilters(defaultCommandFilters)}
						total={commandTotal}
						singularLabel="command"
						pluralLabel="commands"
					/>

					{isAdmin && (
						<div className="flex gap-2 mb-4">
							<button
								onClick={() => handleExport("commands", "json")}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
								type="button"
							>
								Export JSON
							</button>
							<button
								onClick={() => handleExport("commands", "csv")}
								className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
								type="button"
							>
								Export CSV
							</button>
						</div>
					)}

					{/* Command Logs Table */}
					{commandLoading ? (
						<AuditLoadingState />
					) : commandError ? (
						<AuditErrorState error={commandError} />
					) : commandLogs.length === 0 ? (
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
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{commandLogs.map((log) => (
											<Fragment key={log.id}>
												<tr
													className="hover:bg-gray-50 cursor-pointer"
													tabIndex={0}
													onClick={() => toggleRowExpansion(log.id, false)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															toggleRowExpansion(log.id, false);
														}
													}}
												>
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
												</tr>
												{expandedCommandRows.has(log.id) && (
													<tr className="bg-gray-50">
														<td colSpan={3} className="px-4 py-4">
															<div className="space-y-3">
																<div>
																	<h4 className="text-sm font-medium text-gray-700 mb-1">Stdout</h4>
																	{log.stdout ? (
																		<pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
																			{log.stdout}
																		</pre>
																	) : (
																		<p className="text-gray-400 text-sm">No output</p>
																	)}
																</div>
																<div>
																	<h4 className="text-sm font-medium text-gray-700 mb-1">Stderr</h4>
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
											</Fragment>
										))}
									</tbody>
								</table>
							</div>

							<AuditPagination
								total={commandTotal}
								offset={commandOffset}
								setOffset={setCommandOffset}
							/>
						</div>
					)}
				</>
			) : (
				<>
					{/* User Audit Log Filters */}
					<AuditFilters
						fields={[
							{ name: "startDate", label: "Start Date", type: "date" },
							{ name: "endDate", label: "End Date", type: "date" },
							{
								name: "userId",
								label: "User ID",
								type: "text",
								placeholder: "Filter by user ID...",
							},
							{ name: "action", label: "Action", type: "text", placeholder: "Filter by action..." },
						]}
						filters={userFilters}
						onFilterChange={setUserFilter}
						onReset={() => resetUserFilters(defaultUserFilters)}
						total={userTotal}
						singularLabel="log"
						pluralLabel="logs"
					/>

					{isAdmin && (
						<div className="flex gap-2 mb-4">
							<button
								onClick={() => handleExport("users", "json")}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
								type="button"
							>
								Export JSON
							</button>
							<button
								onClick={() => handleExport("users", "csv")}
								className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
								type="button"
							>
								Export CSV
							</button>
						</div>
					)}

					{/* User Audit Logs Table */}
					{userLoading ? (
						<AuditLoadingState />
					) : userError ? (
						<AuditErrorState error={userError} />
					) : userLogs.length === 0 ? (
						<div className="bg-white rounded-lg shadow p-6">
							<p className="text-gray-500">No user audit logs found matching your filters.</p>
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
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{userLogs.map((log) => (
											<Fragment key={log.id}>
												<tr
													className="hover:bg-gray-50 cursor-pointer"
													tabIndex={0}
													onClick={() => toggleRowExpansion(log.id, true)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															toggleRowExpansion(log.id, true);
														}
													}}
												>
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
												</tr>
												{expandedUserRows.has(log.id) && (
													<tr className="bg-gray-50">
														<td colSpan={5} className="px-4 py-4">
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
																		<p className="text-gray-400 text-sm">No details</p>
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

							<AuditPagination total={userTotal} offset={userOffset} setOffset={setUserOffset} />
						</div>
					)}
				</>
			)}
		</div>
	);
}
