import type { Buildpack } from "../../lib/schemas.js";

interface AppBuildpacksProps {
	buildpacks: Buildpack[];
	loading: boolean;
	error: string | null;
	newUrl: string;
	newIndex: string;
	submitting: boolean;
	clearSubmitting: boolean;
	onUrlChange: (url: string) => void;
	onIndexChange: (index: string) => void;
	onAdd: () => void;
	onRemove: (buildpack: Buildpack) => void;
	onClearAll: () => void;
}

export function AppBuildpacks({
	buildpacks,
	loading,
	error,
	newUrl,
	newIndex,
	submitting,
	clearSubmitting,
	onUrlChange,
	onIndexChange,
	onAdd,
	onRemove,
	onClearAll,
}: AppBuildpacksProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Buildpacks</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<div className="space-y-4">
					{buildpacks.length > 0 ? (
						<>
							<div className="overflow-x-auto mb-4">
								<table className="min-w-full divide-y divide-gray-200">
									<thead>
										<tr>
											<th className="px-3 py-2 text-left text-sm font-medium text-gray-700">#</th>
											<th className="px-3 py-2 text-left text-sm font-medium text-gray-700">URL</th>
											<th className="px-3 py-2" />
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{buildpacks.map((buildpack) => (
											<tr key={buildpack.url}>
												<td className="px-3 py-2 text-gray-600">{buildpack.index}</td>
												<td className="px-3 py-2">
													<code className="bg-gray-100 px-2 py-1 rounded text-sm">
														{buildpack.url}
													</code>
												</td>
												<td className="px-3 py-2 text-right">
													<button
														onClick={() => onRemove(buildpack)}
														className="text-red-600 hover:text-red-800"
														title="Remove"
														type="button"
													>
														🗑️
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<button
								onClick={onClearAll}
								disabled={clearSubmitting}
								className="text-red-600 hover:text-red-800 text-sm"
								type="button"
							>
								Clear All
							</button>
						</>
					) : (
						<p className="text-gray-500">Auto-detected (no custom buildpacks set)</p>
					)}

					<div className="pt-4 border-t">
						<h3 className="text-sm font-medium text-gray-700 mb-3">Add Buildpack</h3>
						<div className="flex flex-col sm:flex-row gap-2 mb-2">
							<input
								type="text"
								placeholder="Buildpack URL (e.g., https://github.com/heroku/heroku-buildpack-nodejs)"
								value={newUrl}
								onChange={(e) => onUrlChange(e.target.value)}
								className="flex-1 border rounded px-3 py-2"
							/>
							<input
								type="number"
								placeholder="Index (optional)"
								value={newIndex}
								onChange={(e) => onIndexChange(e.target.value)}
								min="1"
								className="w-32 border rounded px-3 py-2"
							/>
							<button
								onClick={onAdd}
								disabled={!newUrl || submitting}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
								type="button"
							>
								Add
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
