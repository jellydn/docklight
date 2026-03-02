export interface FilterField {
	name: string;
	label: string;
	type: "text" | "date" | "select";
	placeholder?: string;
	options?: { value: string; label: string }[];
}

interface AuditFiltersProps<T extends Record<string, string>> {
	fields: FilterField[];
	filters: T;
	onFilterChange: <K extends keyof T>(key: K, value: T[K]) => void;
	onReset: () => void;
	total: number;
	singularLabel?: string;
	pluralLabel?: string;
}

export function AuditFilters<T extends Record<string, string>>({
	fields,
	filters,
	onFilterChange,
	onReset,
	total,
	singularLabel = "log",
	pluralLabel = "logs",
}: AuditFiltersProps<T>) {
	return (
		<div className="bg-white rounded-lg shadow p-6 mb-6">
			<h2 className="text-lg font-semibold mb-4">Filters</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
				{fields.map((field) => (
					<div key={field.name}>
						<label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
							{field.label}
						</label>
						{field.type === "select" ? (
							<select
								id={field.name}
								value={filters[field.name as keyof T] || ""}
								onChange={(e) =>
									onFilterChange(field.name as keyof T, e.target.value as T[keyof T])
								}
								className="w-full border rounded px-3 py-2"
							>
								{field.options?.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						) : (
							<input
								id={field.name}
								type={field.type}
								placeholder={field.placeholder}
								value={filters[field.name as keyof T] || ""}
								onChange={(e) =>
									onFilterChange(field.name as keyof T, e.target.value as T[keyof T])
								}
								className="w-full border rounded px-3 py-2"
							/>
						)}
					</div>
				))}
			</div>
			<div className="flex items-center gap-2">
				<button
					onClick={onReset}
					className="px-4 py-2 border rounded hover:bg-gray-100"
					type="button"
				>
					Reset Filters
				</button>
				<span className="text-sm text-gray-600">
					{total} {total === 1 ? singularLabel : pluralLabel} found
				</span>
			</div>
		</div>
	);
}
