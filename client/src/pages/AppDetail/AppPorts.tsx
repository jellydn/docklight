import type { PortMapping, ProxyReport } from "../../lib/schemas.js";

interface AppPortsProps {
	ports: PortMapping[];
	proxyReport: ProxyReport | null;
	loading: boolean;
	error: string | null;
	newScheme: string;
	newHostPort: string;
	newContainerPort: string;
	submitting: boolean;
	proxySubmitting: boolean;
	canModify: boolean;
	onSchemeChange: (scheme: string) => void;
	onHostPortChange: (port: string) => void;
	onContainerPortChange: (port: string) => void;
	onAdd: () => void;
	onRemove: (port: PortMapping) => void;
	onClearAll: () => void;
	onEnableProxy: () => void;
	onDisableProxy: () => void;
}

export function AppPorts({
	ports,
	proxyReport,
	loading,
	error,
	newScheme,
	newHostPort,
	newContainerPort,
	submitting,
	proxySubmitting,
	canModify,
	onSchemeChange,
	onHostPortChange,
	onContainerPortChange,
	onAdd,
	onRemove,
	onClearAll,
	onEnableProxy,
	onDisableProxy,
}: AppPortsProps) {
	return (
		<div className="bg-card rounded-lg border border-border p-6">
			<h2 className="text-lg font-semibold mb-4">Ports & Proxy</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<div className="space-y-6">
					<div>
						<h3 className="text-sm font-medium text-foreground mb-3">Port Mappings</h3>

						{ports.length > 0 ? (
							<div className="overflow-x-auto mb-4">
								<table className="min-w-full divide-y divide-border">
									<thead>
										<tr>
											<th className="px-3 py-2 text-left text-sm font-medium text-foreground">
												Scheme
											</th>
											<th className="px-3 py-2 text-left text-sm font-medium text-foreground">
												Host Port
											</th>
											<th className="px-3 py-2 text-left text-sm font-medium text-foreground">
												Container Port
											</th>
											<th className="px-3 py-2">
												<span className="sr-only">Actions</span>
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{ports.map((port) => (
											<tr key={`${port.scheme}-${port.hostPort}-${port.containerPort}`}>
												<td className="px-3 py-2">
													<code className="bg-muted px-2 py-1 rounded text-sm">
														{port.scheme}
													</code>
												</td>
												<td className="px-3 py-2">{port.hostPort}</td>
												<td className="px-3 py-2">{port.containerPort}</td>
												<td className="px-3 py-2 text-right">
													{canModify && (
														<button
															onClick={() => onRemove(port)}
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
							<p className="text-muted-foreground mb-4">No port mappings configured.</p>
						)}

						{canModify && (
							<div className="flex flex-col sm:flex-row gap-2 mb-4">
								<select
									value={newScheme}
									onChange={(e) => onSchemeChange(e.target.value)}
									className="border rounded px-3 py-2"
									aria-label="Port scheme"
								>
									<option value="http">http</option>
									<option value="https">https</option>
									<option value="tcp">tcp</option>
								</select>
								<input
									type="number"
									placeholder="Host Port"
									value={newHostPort}
									onChange={(e) => onHostPortChange(e.target.value)}
									min="1"
									max="65535"
									className="w-32 border rounded px-3 py-2"
									aria-label="Host port"
								/>
								<input
									type="number"
									placeholder="Container Port"
									value={newContainerPort}
									onChange={(e) => onContainerPortChange(e.target.value)}
									min="1"
									max="65535"
									className="w-40 border rounded px-3 py-2"
									aria-label="Container port"
								/>
								<button
									onClick={onAdd}
									disabled={!newHostPort || !newContainerPort || submitting}
									className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
								>
									Add Port
								</button>

								{ports.length > 0 && (
									<button
										onClick={onClearAll}
										className="text-red-600 hover:text-red-800 text-sm"
										type="button"
									>
										Clear All Ports
									</button>
								)}
							</div>
						)}

						<div className="pt-4 border-t">
							<h3 className="text-sm font-medium text-foreground mb-3">Proxy</h3>
							<div className="flex items-center justify-between p-4 bg-muted/50 rounded">
								<div>
									<strong className="text-foreground">Status:</strong>{" "}
									{proxyReport?.enabled ? (
										<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
											Enabled
										</span>
									) : (
										<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-muted text-foreground">
											Disabled
										</span>
									)}
									{proxyReport?.type && (
										<span className="ml-4 text-sm text-muted-foreground">Type: {proxyReport.type}</span>
									)}
								</div>
								{canModify && (
									<div className="flex gap-2">
										{proxyReport?.enabled ? (
											<button
												onClick={onDisableProxy}
												disabled={proxySubmitting}
												className="bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
												type="button"
											>
												Disable
											</button>
										) : (
											<button
												onClick={onEnableProxy}
												disabled={proxySubmitting}
												className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
												type="button"
											>
												Enable
											</button>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
