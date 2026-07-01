import { alertBannerClass } from "@/lib/status-styles.js";

interface AppDomainsProps {
	domains: string[];
	loading: boolean;
	error: string | null;
	newDomain: string;
	submitting: boolean;
	canModify: boolean;
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
	canModify,
	onDomainChange,
	onAdd,
	onRemove,
}: AppDomainsProps) {
	return (
		<div className="bg-card rounded-lg border border-border p-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">Domains</h2>
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
							<h3 className="text-sm font-medium text-foreground mb-2">Add New Domain</h3>
							<div className="flex flex-col sm:flex-row gap-2">
								<input
									type="text"
									placeholder="example.com"
									value={newDomain}
									onChange={(e) => onDomainChange(e.target.value)}
									className="flex-1 border rounded px-3 py-2"
									aria-label="New domain name"
								/>
								<button
									onClick={onAdd}
									disabled={!newDomain || submitting}
									className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded hover:bg-tertiary/90 disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
								>
									Add
								</button>
							</div>
						</div>
					)}

					{domains.length > 0 ? (
						<table className="min-w-full divide-y divide-border">
							<thead>
								<tr>
									<th className="px-4 py-2 text-left text-sm font-medium text-foreground">
										Domain
									</th>
									<th className="px-4 py-2">
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{domains.map((domain) => (
									<tr key={domain}>
										<td className="px-4 py-2">
											<code className="bg-muted px-2 py-1 rounded text-sm">{domain}</code>
										</td>
										<td className="px-4 py-2 text-right">
											{canModify && (
												<button
													onClick={() => onRemove(domain)}
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
					) : (
						<p className="text-muted-foreground">No domains configured.</p>
					)}
				</>
			)}
		</div>
	);
}
