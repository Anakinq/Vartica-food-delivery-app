import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    totalCount?: number;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    pageSize = 10,
    totalCount = 0
}) => {
    // Calculate page range for display
    const getPageNumbers = () => {
        const delta = 2; // Number of pages to show on each side of current page
        const range: (number | string)[] = [];

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        // Add first page and ellipsis if needed
        if (currentPage - delta > 2) {
            range.unshift('...');
            range.unshift(1);
        }

        // Add last page and ellipsis if needed
        if (currentPage + delta < totalPages - 1) {
            range.push('...');
            range.push(totalPages);
        }

        // Ensure we always have the first page if we're near it
        if (currentPage - delta <= 1 && !range.includes(1)) {
            range.unshift(1);
        }

        // Ensure we always have the last page if we're near it
        if (currentPage + delta >= totalPages - 1 && !range.includes(totalPages)) {
            if (range[range.length - 1] !== totalPages) {
                range.push(totalPages);
            }
        }

        return range;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${currentPage <= 1
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${currentPage >= totalPages
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                >
                    Next
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-medium">
                            {Math.min(currentPage * pageSize, totalCount)}
                        </span>{' '}
                        of <span className="font-medium">{totalCount}</span> results
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(1)}
                            disabled={currentPage <= 1}
                            className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage <= 1
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                                    : 'bg-white text-gray-900 hover:text-gray-600'
                                }`}
                        >
                            <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
                        </button>

                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            className={`relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage <= 1
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                                    : 'bg-white text-gray-900 hover:text-gray-600'
                                }`}
                        >
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>

                        {pageNumbers.map((pageNum, index) => (
                            <React.Fragment key={index}>
                                {pageNum === '...' ? (
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 bg-white">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => onPageChange(pageNum as number)}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ${currentPage === pageNum
                                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                : 'text-gray-900 ring-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                )}
                            </React.Fragment>
                        ))}

                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            className={`relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage >= totalPages
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                                    : 'bg-white text-gray-900 hover:text-gray-600'
                                }`}
                        >
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>

                        <button
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage >= totalPages}
                            className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage >= totalPages
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                                    : 'bg-white text-gray-900 hover:text-gray-600'
                                }`}
                        >
                            <ChevronsRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Pagination;