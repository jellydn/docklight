1|export interface FilterField {
2|	name: string;
3|	label: string;
4|	type: "text" | "date" | "select";
5|	placeholder?: string;
6|	options?: { value: string; label: string }[];
7|}
8|
9|interface AuditFiltersProps<T extends Record<string, string>> {
10|	fields: FilterField[];
11|	filters: T;
12|	onFilterChange: <K extends keyof T>(key: K, value: T[K]) => void;
13|	onReset: () => void;
14|	total: number;
15|	singularLabel?: string;
16|	pluralLabel?: string;
17|}
18|
19|export function AuditFilters<T extends Record<string, string>>({
20|	fields,
21|	filters,
22|	onFilterChange,
23|	onReset,
24|	total,
25|	singularLabel = "log",
26|	pluralLabel = "logs",
27|}: AuditFiltersProps<T>) {
28|	return (
29|		<div className="bg-card rounded-lg border border-border p-6 mb-6">
30|			<h2 className="text-lg font-semibold mb-4">Filters</h2>
31|			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
32|				{fields.map((field) => (
33|					<div key={field.name}>
34|						<label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1">
35|							{field.label}
36|						</label>
37|						{field.type === "select" ? (
38|							<select
39|								id={field.name}
40|								value={filters[field.name as keyof T] || ""}
41|								onChange={(e) =>
42|									onFilterChange(field.name as keyof T, e.target.value as T[keyof T])
43|								}
44|								className="w-full border rounded px-3 py-2"
45|								aria-label={field.label}
46|							>
47|								{field.options?.map((option) => (
48|									<option key={option.value} value={option.value}>
49|										{option.label}
50|									</option>
51|								))}
52|							</select>
53|						) : (
54|							<input
55|								id={field.name}
56|								type={field.type}
57|								placeholder={field.placeholder}
58|								value={filters[field.name as keyof T] || ""}
59|								onChange={(e) =>
60|									onFilterChange(field.name as keyof T, e.target.value as T[keyof T])
61|								}
62|								className="w-full border rounded px-3 py-2"
63|								aria-label={field.label}
64|							/>
65|						)}
66|					</div>
67|				))}
68|			</div>
69|			<div className="flex items-center gap-2">
70|				<button
71|					onClick={onReset}
72|					className="px-4 py-2 border rounded hover:bg-accent"
73|					type="button"
74|				>
75|					Reset Filters
76|				</button>
77|				<span className="text-sm text-muted-foreground">
78|					{total} {total === 1 ? singularLabel : pluralLabel} found
79|				</span>
80|			</div>
81|		</div>
82|	);
83|}
84|