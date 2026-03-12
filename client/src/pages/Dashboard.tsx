import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateAppDialog } from "@/components/CreateAppDialog.js";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "@/contexts/auth-context.js";
import { formatDeployTime } from "@/lib/utils.js";
import { queryKeys } from "../lib/query-keys.js";
import { ServerHealthSchema, AppSchema, CommandHistorySchema } from "../lib/schemas.js";

export function Dashboard() {
	const { canModify } = useAuth();
	const queryClient = useQueryClient();
	const [createAppOpen, setCreateAppOpen] = useState(false);

	const { data: health, isLoading: healthLoading } = useQuery({
		queryKey: queryKeys.health,
		queryFn: () => apiFetch("/server/health", ServerHealthSchema),
		refetchInterval: 30000,
	});

	const { data: apps, isLoading: appsLoading } = useQuery({
		queryKey: queryKeys.apps.all,
		queryFn: () => apiFetch("/apps", z.array(AppSchema)),
		refetchInterval: 30000,
	});

	const { data: commands, isLoading: commandsLoading } = useQuery({
		queryKey: queryKeys.commands,
		queryFn: () => apiFetch("/commands?limit=20", z.array(CommandHistorySchema)),
		refetchInterval: 30000,
	});

	const isLoading = healthLoading || appsLoading || commandsLoading;

	const handleRefresh = () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.health });
		void queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.commands });
	};

	const handleAppCreated = () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
	};

	const getHealthColor = (value: number) => {
		if (value < 60) return "bg-green-500";
		if (value < 85) return "bg-yellow-500";
		return "bg-red-500";
	};

	const getStatusBadge = (status: string) => {
		const color = status === "running" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
		return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{status}</span>;
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<Button onClick={handleRefresh} size="sm" variant="outline">
					Refresh
				</Button>
			</div>

			{isLoading && (
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			)}

			{!isLoading && (
				<>
					{/* Server Health */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle>Server Health</CardTitle>
						</CardHeader>
						<CardContent>
							{health && (
								<div className="space-y-4">
									<div>
										<div className="flex justify-between mb-1">
											<span className="text-sm font-medium">CPU</span>
											<span className="text-sm text-gray-600">{health.cpu.toFixed(1)}%</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className={`h-2 rounded-full transition-all ${getHealthColor(health.cpu)}`}
												style={{ width: `${health.cpu}%` }}
											></div>
										</div>
									</div>
									<div>
										<div className="flex justify-between mb-1">
											<span className="text-sm font-medium">Memory</span>
											<span className="text-sm text-gray-600">{health.memory.toFixed(1)}%</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className={`h-2 rounded-full transition-all ${getHealthColor(health.memory)}`}
												style={{ width: `${health.memory}%` }}
											></div>
										</div>
									</div>
									<div>
										<div className="flex justify-between mb-1">
											<span className="text-sm font-medium">Disk</span>
											<span className="text-sm text-gray-600">{health.disk.toFixed(1)}%</span>
										</div>
										<div className="w-full bg-gray-200 rounded-full h-2">
											<div
												className={`h-2 rounded-full transition-all ${getHealthColor(health.disk)}`}
												style={{ width: `${health.disk}%` }}
											></div>
										</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Apps */}
					<div className="bg-white rounded-lg shadow p-6 mb-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold">Apps</h2>
							{canModify && (
								<Button size="sm" onClick={() => setCreateAppOpen(true)}>
									Create App
								</Button>
							)}
						</div>
						{(apps?.length ?? 0) === 0 ? (
							<p className="text-gray-500">No apps found</p>
						) : (
							<div className="overflow-x-auto">
								<table className="min-w-full">
									<thead>
										<tr className="border-b">
											<th className="text-left py-2 px-4">Name</th>
											<th className="text-left py-2 px-4">Status</th>
											<th className="text-left py-2 px-4">Domains</th>
											<th className="text-left py-2 px-4">Last Deploy</th>
										</tr>
									</thead>
									<tbody>
										{(apps ?? []).map((app) => (
											<tr key={app.name} className="border-b">
												<td className="py-2 px-4">
													<Link to={`/apps/${app.name}`} className="text-blue-600 hover:underline">
														{app.name}
													</Link>
												</td>
												<td className="py-2 px-4">{getStatusBadge(app.status)}</td>
												<td className="py-2 px-4">
													{app.domains.length > 0 ? (
														<ul className="list-disc list-inside">
															{app.domains.map((domain) => (
																<li key={domain}>{domain}</li>
															))}
														</ul>
													) : (
														<span className="text-gray-400">-</span>
													)}
												</td>
												<td className="py-2 px-4">{formatDeployTime(app.lastDeployTime)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{/* Recent Activity */}
					<div className="bg-white rounded-lg shadow p-6">
						<h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
						{(commands?.length ?? 0) === 0 ? (
							<p className="text-gray-500">No recent activity</p>
						) : (
							<div className="space-y-2">
								{(commands ?? []).map((cmd) => (
									<div key={cmd.id} className="text-sm">
										<div className="font-mono bg-gray-100 p-2 rounded">{cmd.command}</div>
										<div className="text-gray-500 text-xs mt-1">
											{new Date(cmd.createdAt).toLocaleString()}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</>
			)}
			{canModify && (
				<CreateAppDialog
					open={createAppOpen}
					onOpenChange={setCreateAppOpen}
					onCreated={handleAppCreated}
				/>
			)}
		</div>
	);
}
