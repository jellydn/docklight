import type { ConfigVars } from "../../lib/schemas.js";

interface AppConfigProps {
	configVars: ConfigVars;
	loading: boolean;
	error: string | null;
	newKey: string;
	newValue: string;
	submitting: boolean;
	visibleValues: Set<string>;
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
	onKeyChange,
	onValueChange,
	onAdd,
	onRemove,
	onToggleVisibility,
}: AppConfigProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">Environment Variables</h2>
			</div>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<>
					<div className="mb-6">
						<h3 className="text-sm font-medium text-gray-700 mb-2">Add New Variable</h3>
						<div className="flex flex-col sm:flex-row gap-2">
							<input
								type="text"
								placeholder="Key"
								value={newKey}
								onChange={(e) => onKeyChange(e.target.value)}
								className="flex-1 border rounded px-3 py-2"
							/>
							<input
								type="text"
								placeholder="Value"
								value={newValue}
								onChange={(e) => onValueChange(e.target.value)}
								className="flex-1 border rounded px-3 py-2"
							/>
							<button
								onClick={onAdd}
								disabled={!newKey || !newValue || submitting}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
								type="button"
							>
								Set
							</button>
						</div>
					</div>

					{Object.keys(configVars).length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead>
									<tr>
										<th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Key</th>
										<th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
											Value
										</th>
										<th className="px-4 py-2" />
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{Object.entries(configVars).map(([key, value]) => (
										<tr key={key}>
											<td className="px-4 py-2">
												<code className="bg-gray-100 px-2 py-1 rounded text-sm">{key}</code>
											</td>
											<td className="px-4 py-2">
												<button
													onClick={() => onToggleVisibility(key)}
													className="font-mono text-sm cursor-pointer hover:text-blue-600"
													type="button"
												>
													{visibleValues.has(key) ? value : "••••••"}
												</button>
											</td>
											<td className="px-4 py-2 text-right">
												<button
													onClick={() => onRemove(key)}
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
					) : (
						<p className="text-gray-500">No environment variables configured.</p>
					)}
				</>
			)}
		</div>
	);
}
