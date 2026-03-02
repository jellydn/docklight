import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "../lib/api.js";
import type { PluginInfo } from "../lib/schemas.js";
import { PluginInfoSchema } from "../lib/schemas.js";

export function Plugins() {
	const [plugins, setPlugins] = useState<PluginInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchPlugins = async () => {
			setLoading(true);
			setError(null);
			try {
				const pluginData = await apiFetch("/plugins", z.array(PluginInfoSchema));
				setPlugins(pluginData);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load plugins");
			} finally {
				setLoading(false);
			}
		};
		fetchPlugins();
	}, []);

	if (loading) {
		return (
			<div className="flex justify-center items-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
		);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Plugins</h1>

			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold mb-4">Installed Plugins</h2>
				{plugins.length === 0 ? (
					<p className="text-gray-500">No plugins found</p>
				) : (
					<div className="space-y-3">
						{plugins.map((plugin) => (
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
