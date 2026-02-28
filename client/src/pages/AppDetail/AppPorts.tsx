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
		<div className="bg-white rounded-lg shadow p-6">
			<h2 className="text-lg font-semibold mb-4">Ports & Proxy</h2>

			{loading ? (
				<div className="flex justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
				</div>
			) : error ? (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			) : (
				<div className="space-y-6">
					<div>
						<h3 className="text-sm font-medium text-gray-700 mb-3">Port Mappings</h3>

						{ports.length > 0 ? (
							<div className="overflow-x-auto mb-4">
								<table className="min-w-full divide-y divide-gray-200">
									<thead>
										<tr>
											<th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
												Scheme
											</th>
											<th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
												Host Port
											</th>
											<th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
												Container Port
											</th>
											<th className="px-3 py-2" />
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200">
										{ports.map((port) => (
											<tr
												key={`${port.scheme}-${port.hostPort}-${port.containerPort}`}
											>
												<td className="px-3 py-2">
													<code className="bg-gray-100 px-2 py-1 rounded text-sm">
														{port.scheme}
													</code>
												</td>
												<td className="px-3 py-2">{port.hostPort}</td>
												<td className="px-3 py-2">{port.containerPort}</td>
												<td className="px-3 py-2 text-right">
													<button
														onClick={() => onRemove(port)}
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
							<p className="text-gray-500 mb-4">No port mappings configured.</p>
						)}

						<div className="flex flex-col sm:flex-row gap-2 mb-4">
							<select
								value={newScheme}
								onChange={(e) => onSchemeChange(e.target.value)}
								className="border rounded px-3 py-2"
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
							/>
							<input
								type="number"
								placeholder="Container Port"
								value={newContainerPort}
								onChange={(e) => onContainerPortChange(e.target.value)}
								min="1"
								max="65535"
								className="w-40 border rounded px-3 py-2"
							/>
							<button
								onClick={onAdd}
								disabled={!newHostPort || !newContainerPort || submitting}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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

						<div className="pt-4 border-t">
							<h3 className="text-sm font-medium text-gray-700 mb-3">Proxy</h3>
							<div className="flex items-center justify-between p-4 bg-gray-50 rounded">
								<div>
									<strong className="text-gray-700">Status:</strong>{" "}
									{proxyReport?.enabled ? (
										<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
											Enabled
										</span>
									) : (
										<span className="ml-2 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
											Disabled
										</span>
									)}
									{proxyReport?.type && (
										<span className="ml-4 text-sm text-gray-500">
											Type: {proxyReport.type}
										</span>
									)}
								</div>
								<div className="flex gap-2">
									{proxyReport?.enabled ? (
										<button
											onClick={onDisableProxy}
											disabled={proxySubmitting}
											className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
											type="button"
										>
											Disable
										</button>
									) : (
										<button
											onClick={onEnableProxy}
											disabled={proxySubmitting}
											className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
											type="button"
										>
											Enable
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
