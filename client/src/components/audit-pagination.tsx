const ITEMS_PER_PAGE = 50;

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
		<div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
			<div className="flex-1 flex justify-between sm:hidden">
				<button
					onClick={handlePrevious}
					disabled={offset === 0}
					className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
					type="button"
				>
					Previous
				</button>
				<button
					onClick={handleNext}
					disabled={offset + ITEMS_PER_PAGE >= total}
					className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
					type="button"
				>
					Next
				</button>
			</div>
			<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-gray-700">
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
							className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
							type="button"
						>
							Previous
						</button>
						<span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
							Page {currentPage} of {totalPages}
						</span>
						<button
							onClick={handleNext}
							disabled={offset + ITEMS_PER_PAGE >= total}
							className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
