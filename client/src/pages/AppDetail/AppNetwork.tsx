import type { NetworkReport } from "../../lib/schemas.js";

interface AppNetworkProps {
	networkReport: NetworkReport | null;
	loading: boolean;
	error: string | null;
	submitting: boolean;
	editingKey: string | null;
	editValue: string;
	onStartEdit: (key: string, currentValue: string) => void;
	onCancelEdit: () => void;
	onSave: (key: string) => void;
	onClear: (key: string) => void;
	onValueChange: (value: string) => void;
}

const NETWORK_KEYS = [
	"attach-post-create",
	"attach-post-deploy",
	"bind-all-interfaces",
	"initial-network",
	"static-web-listener",
	"tls-internal",
] as const;

export function AppNetwork({
	networkReport,
	loading,
	error,
	submitting,
	editingKey,
	editValue,
	onStartEdit,
	onCancelEdit,
	onSave,
	onClear,
	onValueChange,
}: AppNetworkProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Network</h2>

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
					<p className="text-sm text-gray-500 mb-4">
						Configure network properties for this app. Click a value to edit, or use the clear
						button to remove a setting.
					</p>

					{NETWORK_KEYS.map((key) => {
						const value = networkReport?.[key] ?? "";
						const isEditing = editingKey === key;
						const isNotSet = !value || value === "";

						return (
							<div key={key} className="flex items-center justify-between py-2 border-b">
								<div className="flex-1">
									<span className="font-medium text-gray-700">{key}</span>
									{isEditing ? (
										<div className="flex items-center gap-2 mt-2">
											<input
												type="text"
												value={editValue}
												onChange={(e) => onValueChange(e.target.value)}
												placeholder="true/false or value"
												className="border rounded px-3 py-1 text-sm"
											/>
											<button
												onClick={() => onSave(key)}
												disabled={submitting}
												className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
												type="button"
											>
												Save
											</button>
											<button
												onClick={onCancelEdit}
												disabled={submitting}
												className="text-gray-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
												type="button"
											>
												Cancel
											</button>
										</div>
									) : (
										<div className="flex items-center gap-2 mt-1">
											{isNotSet ? (
												<span className="text-gray-400 italic">not set</span>
											) : (
												<span className="text-gray-800 font-mono text-sm">{value}</span>
											)}
											<button
												onClick={() => onStartEdit(key, value)}
												className="text-blue-600 hover:text-blue-800 text-sm"
												type="button"
											>
												{isNotSet ? "Set" : "Edit"}
											</button>
											{!isNotSet && (
												<button
													onClick={() => onClear(key)}
													disabled={submitting}
													className="text-red-600 hover:text-red-800 text-sm"
													type="button"
												>
													Clear
												</button>
											)}
										</div>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
