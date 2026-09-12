import type { Buildpack } from "../../lib/schemas.js";
import { alertBannerClass } from "@/lib/status-styles.js";

interface AppBuildpacksProps {
	buildpacks: Buildpack[];
	loading: boolean;
	error: string | null;
	newUrl: string;
	newIndex: string;
	submitting: boolean;
	clearSubmitting: boolean;
	canModify: boolean;
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
	canModify,
	onUrlChange,
	onIndexChange,
	onAdd,
	onRemove,
	onClearAll,
}: AppBuildpacksProps) {
	return (
		<div className="bg-card rounded-lg border border-border p-6">
			<h2 className="text-lg font-semibold mb-4">Buildpacks</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tertiary" />
				</div>
			) : error ? (
				<div className={alertBannerClass("error")}>
					{error}
				</div>
			) : (
				<div className="space-y-4">
					{buildpacks.length > 0 ? (
						<>
							<div className="overflow-x-auto mb-4">
								<table className="min-w-full divide-y divide-border">
									<thead>
										<tr>
											<th className="px-3 py-2 text-left text-sm font-medium text-foreground">#</th>
											<th className="px-3 py-2 text-left text-sm font-medium text-foreground">
												URL
											</th>
											<th className="px-3 py-2">
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{buildpacks.map((buildpack) => (
											<tr key={buildpack.url}>
												<td className="px-3 py-2 text-muted-foreground">{buildpack.index}</td>
												<td className="px-3 py-2">
													<code className="bg-muted px-2 py-1 rounded text-sm">
														{buildpack.url}
													</code>
												</td>
												<td className="px-3 py-2 text-right">
													{canModify && (
														<button
															onClick={() => onRemove(buildpack)}
															className="text-red-600 hover:text-red-800"
															title="Remove"
															type="button"
														>
															🗑️
														</button>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{canModify && (
								<button
									onClick={onClearAll}
									disabled={clearSubmitting}
									className="text-red-600 hover:text-red-800 text-sm"
									type="button"
								>
									Clear All
								</button>
							)}
						</>
					) : (
						<p className="text-muted-foreground">Auto-detected (no custom buildpacks set)</p>
					)}

					{canModify && (
						<div className="pt-4 border-t">
							<h3 className="text-sm font-medium text-foreground mb-3">Add Buildpack</h3>
							<div className="flex flex-col sm:flex-row gap-2 mb-2">
								<input
									type="text"
									placeholder="Buildpack URL (e.g., https://github.com/heroku/heroku-buildpack-nodejs)"
									value={newUrl}
									onChange={(e) => onUrlChange(e.target.value)}
									className="flex-1 border rounded px-3 py-2"
									aria-label="Buildpack URL"
								/>
								<input
									type="number"
									placeholder="Index (optional)"
									value={newIndex}
									onChange={(e) => onIndexChange(e.target.value)}
									min="1"
									className="w-32 border rounded px-3 py-2"
									aria-label="Buildpack index"
								/>
								<button
									onClick={onAdd}
									disabled={!newUrl || submitting}
									className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
								>
									Add
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
