import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CreateAppDialog } from "@/components/CreateAppDialog.js";
import { apiFetch } from "../lib/api.js";
import { AppSchema, type App } from "../lib/schemas.js";

export function Apps() {
	const [apps, setApps] = useState<App[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [createAppOpen, setCreateAppOpen] = useState(false);

	const fetchApps = useCallback(async () => {
		try {
			const appsData = await apiFetch("/apps", z.array(AppSchema));
			setApps(Array.isArray(appsData) ? appsData : []);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load apps");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchApps();
	}, [fetchApps]);

	const getStatusBadge = (status: string) => {
		const color = status === "running" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
		return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{status}</span>;
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold">Apps</h1>
				<Button onClick={() => setCreateAppOpen(true)}>Create App</Button>
			</div>

			{loading && (
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			)}

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
					{error}
				</div>
			)}

			{!loading && !error && (
				<div className="bg-white rounded-lg shadow">
					{apps.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-gray-500 mb-4">No apps found</p>
							<Button onClick={() => setCreateAppOpen(true)}>Create your first app</Button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full">
								<thead>
									<tr className="border-b bg-gray-50">
										<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
											Name
										</th>
										<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
											Status
										</th>
										<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
											Domains
										</th>
										<th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
											Last Deploy
										</th>
									</tr>
								</thead>
								<tbody>
									{apps.map((app) => (
										<tr key={app.name} className="border-b hover:bg-gray-50">
											<td className="py-3 px-4">
												<Link
													to={`/apps/${app.name}`}
													className="text-blue-600 hover:underline font-medium"
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
													<span className="text-gray-400">-</span>
												)}
											</td>
											<td className="py-3 px-4 text-sm text-gray-600">
												{app.lastDeployTime || "-"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			<CreateAppDialog
				open={createAppOpen}
				onOpenChange={setCreateAppOpen}
				onCreated={() => {
					void fetchApps();
				}}
			/>
		</div>
	);
}
