1|import { ITEMS_PER_PAGE } from "../lib/constants.js";
2|
3|interface AuditPaginationProps {
4|	total: number;
5|	offset: number;
6|	setOffset: (offset: number) => void;
7|}
8|
9|export function AuditPagination({ total, offset, setOffset }: AuditPaginationProps) {
10|	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
11|	const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
12|
13|	if (totalPages <= 1) return null;
14|
15|	const handlePrevious = () => setOffset(Math.max(0, offset - ITEMS_PER_PAGE));
16|	const handleNext = () => setOffset(offset + ITEMS_PER_PAGE);
17|
18|	return (
19|		<div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-t border-border">
20|			<div className="flex-1 flex justify-between sm:hidden">
21|				<button
22|					onClick={handlePrevious}
23|					disabled={offset === 0}
24|					className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-card hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
25|					type="button"
26|				>
27|					Previous
28|				</button>
29|				<button
30|					onClick={handleNext}
31|					disabled={offset + ITEMS_PER_PAGE >= total}
32|					className="ml-3 px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-card hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
33|					type="button"
34|				>
35|					Next
36|				</button>
37|			</div>
38|			<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
39|				<div>
40|					<p className="text-sm text-foreground">
41|						Showing <span className="font-medium">{offset + 1}</span> to{" "}
42|						<span className="font-medium">{Math.min(offset + ITEMS_PER_PAGE, total)}</span> of{" "}
43|						<span className="font-medium">{total}</span> results
44|					</p>
45|				</div>
46|				<div>
47|					<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
48|						<button
49|							onClick={handlePrevious}
50|							disabled={offset === 0}
51|							className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
52|							type="button"
53|						>
54|							Previous
55|						</button>
56|						<span className="relative inline-flex items-center px-4 py-2 border border-border bg-card text-sm font-medium text-foreground">
57|							Page {currentPage} of {totalPages}
58|						</span>
59|						<button
60|							onClick={handleNext}
61|							disabled={offset + ITEMS_PER_PAGE >= total}
62|							className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
63|							type="button"
64|						>
65|							Next
66|						</button>
67|					</nav>
68|				</div>
69|			</div>
70|		</div>
71|	);
72|}
73|