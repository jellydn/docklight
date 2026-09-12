import { ITEMS_PER_PAGE } from "../lib/constants.js";

interface AuditPaginationProps {
	total: number;
	offset: number;
	setOffset: (offset: number) => void;
}

export function AuditPagination({ total, offset, setOffset }: AuditPaginationProps) {
	const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
	const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;

	if (totalPages <= 1) return null;

	const handlePrevious = () => setOffset(Math.max(0, offset - ITEMS_PER_PAGE));
	const handleNext = () => setOffset(offset + ITEMS_PER_PAGE);

	return (
		<div className="bg-muted/50 px-4 py-3 flex items-center justify-between border-t border-border">
			<div className="flex-1 flex justify-between sm:hidden">
				<button
					onClick={handlePrevious}
					disabled={offset === 0}
					className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-card hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
					type="button"
				>
					Previous
				</button>
				<button
					onClick={handleNext}
					disabled={offset + ITEMS_PER_PAGE >= total}
					className="ml-3 px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground bg-card hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
					type="button"
				>
					Next
				</button>
			</div>
			<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-foreground">
						Showing <span className="font-medium">{offset + 1}</span> to{" "}
						<span className="font-medium">{Math.min(offset + ITEMS_PER_PAGE, total)}</span> of{" "}
						<span className="font-medium">{total}</span> results
					</p>
				</div>
				<div>
					<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
						<button
							onClick={handlePrevious}
							disabled={offset === 0}
							className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
							type="button"
						>
							Previous
						</button>
						<span className="relative inline-flex items-center px-4 py-2 border border-border bg-card text-sm font-medium text-foreground">
							Page {currentPage} of {totalPages}
						</span>
						<button
							onClick={handleNext}
							disabled={offset + ITEMS_PER_PAGE >= total}
							className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:text-muted-foreground/50 disabled:cursor-not-allowed"
							type="button"
						>
							Next
						</button>
					</nav>
				</div>
			</div>
		</div>
	);
}
