interface AppDomainsProps {
	domains: string[];
	loading: boolean;
	error: string | null;
	newDomain: string;
	submitting: boolean;
	onDomainChange: (domain: string) => void;
	onAdd: () => void;
	onRemove: (domain: string) => void;
}

export function AppDomains({
	domains,
	loading,
	error,
	newDomain,
	submitting,
	onDomainChange,
	onAdd,
	onRemove,
}: AppDomainsProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">Domains</h2>
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
						<h3 className="text-sm font-medium text-gray-700 mb-2">Add New Domain</h3>
						<div className="flex flex-col sm:flex-row gap-2">
							<input
								type="text"
								placeholder="example.com"
								value={newDomain}
								onChange={(e) => onDomainChange(e.target.value)}
								className="flex-1 border rounded px-3 py-2"
							/>
							<button
								onClick={onAdd}
								disabled={!newDomain || submitting}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
								type="button"
							>
								Add
							</button>
						</div>
					</div>

					{domains.length > 0 ? (
						<table className="min-w-full divide-y divide-gray-200">
							<thead>
								<tr>
									<th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Domain</th>
									<th className="px-4 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{domains.map((domain) => (
									<tr key={domain}>
										<td className="px-4 py-2">
											<code className="bg-gray-100 px-2 py-1 rounded text-sm">{domain}</code>
										</td>
										<td className="px-4 py-2 text-right">
											<button
												onClick={() => onRemove(domain)}
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
					) : (
						<p className="text-gray-500">No domains configured.</p>
					)}
				</>
			)}
		</div>
	);
}
