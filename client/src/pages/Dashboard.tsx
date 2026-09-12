import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CreateAppDialog } from "@/components/CreateAppDialog.js";
import { ServerHealthCard } from "@/components/ServerHealthCard.js";
import { useServerMaintenanceMutation } from "@/hooks/use-server-maintenance-mutation.js";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "@/contexts/auth-context.js";
import { formatDeployTime } from "@/lib/utils.js";
import { statusBadgeClass, statusDotClass } from "@/lib/status-styles.js";
import { queryKeys } from "../lib/query-keys.js";
import {
	ServerHealthSchema,
	AppSchema,
	CommandHistorySchema,
	CommandResultSchema,
	PurgeCacheResultSchema,
} from "../lib/schemas.js";

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

	const cleanupMutation = useServerMaintenanceMutation({
		endpoint: "/server/cleanup",
		schema: CommandResultSchema,
		successMessage: "Cleanup completed",
		errorMessage: "Cleanup failed",
	});

	const purgeCacheMutation = useServerMaintenanceMutation({
		endpoint: "/server/purge-cache",
		schema: PurgeCacheResultSchema,
		successMessage: "Build caches purged",
		errorMessage: "Build cache purge failed",
	});

	const submittingAction = cleanupMutation.isPending
		? "cleanup"
		: purgeCacheMutation.isPending
			? "purge"
			: null;

	const isLoading = healthLoading || appsLoading || commandsLoading;

	const handleRefresh = () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.health });
		void queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.commands });
	};

	const handleAppCreated = () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
	};

	const getStatusBadge = (status: string) => {
		return (
			<span className={statusBadgeClass(status)}>
				<span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
				{status}
			</span>
		);
	};

	return (
		<div>
			<div className="page-header">
				<h1 className="page-title">Dashboard</h1>
				<Button onClick={handleRefresh} size="sm" variant="outline">
					Refresh
				</Button>
			</div>

			{isLoading && (
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-2 border-tertiary border-t-transparent" />
				</div>
			)}

			{!isLoading && (
				<>
					{health && (
						<ServerHealthCard
							health={health}
							canModify={canModify}
							submittingAction={submittingAction}
							onActionConfirm={(actionId) => {
								if (actionId === "cleanup") {
									cleanupMutation.mutate();
									return;
								}
								purgeCacheMutation.mutate();
							}}
						/>
					)}

					<div className="bg-card rounded-lg border border-border p-4 sm:p-6 mb-6">
						<div className="page-header mb-4">
							<h2 className="text-lg font-semibold">Apps</h2>
							{canModify && (
								<Button size="sm" onClick={() => setCreateAppOpen(true)}>
									Create App
								</Button>
							)}
						</div>
						{(apps?.length ?? 0) === 0 ? (
							<p className="text-muted-foreground text-sm py-8 text-center">No apps found</p>
						) : (
							<div className="overflow-x-auto -mx-4 sm:mx-0">
								<table className="data-table">
									<thead>
										<tr className="border-b border-border">
											<th>Name</th>
											<th>Status</th>
											<th>Domains</th>
											<th>Last Deploy</th>
										</tr>
									</thead>
									<tbody>
										{(apps ?? []).map((app) => (
											<tr
												key={app.name}
												className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
											>
												<td className="py-3 px-4">
													<Link
														to={`/apps/${app.name}`}
														className="text-tertiary hover:underline font-medium break-all"
													>
														{app.name}
													</Link>
												</td>
												<td className="py-3 px-4">{getStatusBadge(app.status)}</td>
												<td className="py-3 px-4 text-sm text-muted-foreground">
													{app.domains.length > 0 ? (
														<ul className="space-y-0.5">
															{app.domains.map((domain) => (
																<li key={domain}>{domain}</li>
															))}
														</ul>
													) : (
														<span className="text-muted-foreground/50">-</span>
													)}
												</td>
												<td className="py-3 px-4 text-sm text-muted-foreground">
													{formatDeployTime(app.lastDeployTime)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<div className="bg-card rounded-lg border border-border p-4 sm:p-6">
						<h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
						{(commands?.length ?? 0) === 0 ? (
							<p className="text-muted-foreground text-sm py-8 text-center">No recent activity</p>
						) : (
							<div className="space-y-3">
								{(commands ?? []).map((cmd) => (
									<div key={cmd.id} className="text-sm">
										<div className="font-mono bg-muted p-3 rounded-md text-sm">{cmd.command}</div>
										<div className="text-muted-foreground text-xs mt-1.5">
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
