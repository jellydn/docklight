import type { ConfigVars } from "../../lib/schemas.js";
import { alertBannerClass } from "@/lib/status-styles.js";

interface AppConfigProps {
	configVars: ConfigVars;
	loading: boolean;
	error: string | null;
	newKey: string;
	newValue: string;
	submitting: boolean;
	visibleValues: Set<string>;
	canModify: boolean;
	onKeyChange: (key: string) => void;
	onValueChange: (value: string) => void;
	onAdd: () => void;
	onRemove: (key: string) => void;
	onToggleVisibility: (key: string) => void;
}

export function AppConfig({
	configVars,
	loading,
	error,
	newKey,
	newValue,
	submitting,
	visibleValues,
	canModify,
	onKeyChange,
	onValueChange,
	onAdd,
	onRemove,
	onToggleVisibility,
}: AppConfigProps) {
	return (
		<div className="bg-card rounded-lg border border-border p-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">Environment Variables</h2>
			</div>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tertiary" />
				</div>
			) : error ? (
				<div className={alertBannerClass("error")}>
					{error}
				</div>
			) : (
				<>
					{canModify && (
						<div className="mb-6">
							<h3 className="text-sm font-medium text-foreground mb-2">Add New Variable</h3>
							<div className="flex flex-col sm:flex-row gap-2">
								<input
									type="text"
									placeholder="Key"
									value={newKey}
									onChange={(e) => onKeyChange(e.target.value)}
									className="flex-1 border rounded px-3 py-2"
									aria-label="Config variable key"
								/>
								<input
									type="text"
									placeholder="Value"
									value={newValue}
									onChange={(e) => onValueChange(e.target.value)}
									className="flex-1 border rounded px-3 py-2"
									aria-label="Config variable value"
								/>
								<button
									onClick={onAdd}
									disabled={!newKey || !newValue || submitting}
									className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
								>
									Set
								</button>
							</div>
						</div>
					)}

					{Object.keys(configVars).length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-border">
								<thead>
									<tr>
										<th className="px-4 py-2 text-left text-sm font-medium text-foreground">Key</th>
										<th className="px-4 py-2 text-left text-sm font-medium text-foreground">
											Value
										</th>
										<th className="px-4 py-2">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{Object.entries(configVars).map(([key, value]) => (
										<tr key={key}>
											<td className="px-4 py-2">
												<code className="bg-muted px-2 py-1 rounded text-sm">{key}</code>
											</td>
											<td className="px-4 py-2">
												<button
													onClick={() => onToggleVisibility(key)}
													className="font-mono text-sm cursor-pointer hover:text-tertiary"
													type="button"
												>
													{visibleValues.has(key) ? value : "••••••"}
												</button>
											</td>
											<td className="px-4 py-2 text-right">
												{canModify && (
													<button
														onClick={() => onRemove(key)}
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
					) : (
						<p className="text-muted-foreground">No environment variables configured.</p>
					)}
				</>
			)}
		</div>
	);
}
