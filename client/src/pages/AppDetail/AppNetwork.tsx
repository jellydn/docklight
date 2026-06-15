import type { NetworkReport } from "../../lib/schemas.js";

interface AppNetworkProps {
	networkReport: NetworkReport | null;
	loading: boolean;
	error: string | null;
	submitting: boolean;
	editingKey: string | null;
	editValue: string;
	canModify: boolean;
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
	canModify,
	onStartEdit,
	onCancelEdit,
	onSave,
	onClear,
	onValueChange,
}: AppNetworkProps) {
	return (
		<div className="bg-card rounded-lg border border-border p-6">
			<h2 className="text-lg font-semibold mb-4">Network</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tertiary" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<div className="space-y-4">
					<p className="text-sm text-muted-foreground mb-4">
						{canModify
							? "Configure network properties for this app. Click a value to edit, or use the clear button to remove a setting."
							: "Network properties for this app."}
					</p>

					{NETWORK_KEYS.map((key) => {
						const value = networkReport?.[key] ?? "";
						const isEditing = editingKey === key;
						const isNotSet = !value || value === "";

						return (
							<div key={key} className="flex items-center justify-between py-2 border-b">
								<div className="flex-1">
									<span className="font-medium text-foreground">{key}</span>
									{isEditing && canModify ? (
										<div className="flex items-center gap-2 mt-2">
											<input
												type="text"
												value={editValue}
												onChange={(e) => onValueChange(e.target.value)}
												placeholder="true/false or value"
												className="border rounded px-3 py-1 text-sm"
												aria-label={`Edit ${key}`}
											/>
											<button
												onClick={() => onSave(key)}
												disabled={submitting}
												className="bg-tertiary text-tertiary-foreground px-3 py-1 rounded text-sm hover:bg-tertiary/90 disabled:opacity-50"
												type="button"
											>
												Save
											</button>
											<button
												onClick={onCancelEdit}
												disabled={submitting}
												className="text-muted-foreground px-3 py-1 rounded text-sm hover:bg-accent"
												type="button"
											>
												Cancel
											</button>
										</div>
									) : (
										<div className="flex items-center gap-2 mt-1">
											{isNotSet ? (
												<span className="text-muted-foreground/60 italic">not set</span>
											) : (
												<span className="text-foreground font-mono text-sm">{value}</span>
											)}
											{canModify && (
												<button
													onClick={() => onStartEdit(key, value)}
													className="text-primary hover:text-primary text-sm"
													type="button"
												>
													{isNotSet ? "Set" : "Edit"}
												</button>
											)}
											{canModify && !isNotSet && (
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
