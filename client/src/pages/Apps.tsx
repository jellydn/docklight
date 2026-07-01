import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CreateAppDialog } from "@/components/CreateAppDialog.js";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "@/contexts/auth-context.js";
import { formatDeployTime } from "@/lib/utils.js";
import { alertBannerClass, statusBadgeClass } from "@/lib/status-styles.js";
import { queryKeys } from "../lib/query-keys.js";
import { AppSchema } from "../lib/schemas.js";

export function Apps() {
	const { canModify } = useAuth();
	const [createAppOpen, setCreateAppOpen] = useState(false);

	const {
		data: apps,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: queryKeys.apps.all,
		queryFn: () => apiFetch("/apps", z.array(AppSchema)),
	});

	const getStatusBadge = (status: string) => {
		return <span className={statusBadgeClass(status)}>{status}</span>;
	};

	return (
		<div>
			<div className="page-header">
				<h1 className="page-title">Apps</h1>
				{canModify && <Button onClick={() => setCreateAppOpen(true)}>Create App</Button>}
			</div>

			{isLoading && (
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tertiary"></div>
				</div>
			)}

			{error && <div className={`${alertBannerClass("error")} mb-6`}>{error.message}</div>}

			{!isLoading && !error && (
				<div className="bg-card rounded-lg border border-border">
					{(apps?.length ?? 0) === 0 ? (
						<div className="text-center py-12">
							<p className="text-muted-foreground mb-4">No apps found</p>
							{canModify && (
								<Button onClick={() => setCreateAppOpen(true)}>Create your first app</Button>
							)}
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="data-table">
								<thead>
									<tr className="border-b border-border bg-muted/50">
										<th>Name</th>
										<th>Status</th>
										<th>Domains</th>
										<th>Last Deploy</th>
									</tr>
								</thead>
								<tbody>
									{apps?.map((app) => (
										<tr key={app.name} className="border-b border-border hover:bg-accent">
											<td className="py-3 px-4">
												<Link
													to={`/apps/${app.name}`}
													className="text-primary hover:underline font-medium"
												>
													{app.name}
												</Link>
											</td>
											<td className="py-3 px-4">{getStatusBadge(app.status)}</td>
											<td className="py-3 px-4">
												{app.domains.length > 0 ? (
													<ul className="list-disc list-inside">
														{app.domains.map((domain) => (
															<li key={domain} className="text-sm">
																{domain}
															</li>
														))}
													</ul>
												) : (
													<span className="text-muted-foreground/60">-</span>
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
			)}

			{canModify && (
				<CreateAppDialog
					open={createAppOpen}
					onOpenChange={setCreateAppOpen}
					onCreated={() => {
						void refetch();
					}}
				/>
			)}
		</div>
	);
}
