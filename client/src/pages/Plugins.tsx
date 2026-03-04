import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import { PluginInfoSchema } from "../lib/schemas.js";
import { queryKeys } from "../lib/query-keys.js";

export function Plugins() {
	const {
		data: plugins,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.plugins,
		queryFn: () => apiFetch("/plugins", z.array(PluginInfoSchema)),
	});

	if (isLoading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
				{error.message}
			</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Plugins</h1>

			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold mb-4">Installed Plugins</h2>
				{(plugins ?? []).length === 0 ? (
					<div>
						<p className="text-gray-500 mb-4">No plugins found</p>
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<h3 className="font-semibold mb-2">How to install plugins</h3>
							<p className="text-sm text-gray-700 mb-2">
								To install a Dokku plugin, run the following command on your server:
							</p>
							<code className="block bg-white border rounded px-3 py-1.5 text-sm font-mono select-all">
								sudo dokku plugin:install &lt;repository-url&gt;
							</code>
							<p className="text-sm text-gray-700 mt-2">
								For example, to install the Postgres plugin:
							</p>
							<code className="block bg-white border rounded px-3 py-1.5 text-sm font-mono select-all mt-1">
								sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git
							</code>
						</div>
					</div>
				) : (
					<div className="space-y-3">
						{(plugins ?? []).map((plugin) => (
							<div
								key={plugin.name}
								className="border rounded p-4 flex items-center justify-between gap-4"
							>
								<div>
									<div className="font-medium">{plugin.name}</div>
									<div className="text-sm text-gray-600">
										Status: {plugin.enabled ? "Enabled" : "Disabled"}
										{plugin.version ? ` • v${plugin.version}` : ""}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
