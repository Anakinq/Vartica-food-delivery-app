// src/components/customer/SearchAndFilters.tsx
// Optimized search and filter component

import React, { useState, useCallback } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchAndFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    sortBy: string;
    onSortChange: (sort: string) => void;
    ratingFilter: string;
    onRatingChange: (rating: string) => void;
    showFilters: boolean;
    onToggleFilters: () => void;
    placeholder?: string;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
    searchQuery,
    onSearchChange,
    sortBy,
    onSortChange,
    ratingFilter,
    onRatingChange,
    showFilters,
    onToggleFilters,
    placeholder = "Search for food, vendors..."
}) => {
    // Debounced search to prevent excessive filtering
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

    const handleSearchChange = useCallback((value: string) => {
        onSearchChange(value);
        // Debounce the actual filtering
        setTimeout(() => {
            setDebouncedQuery(value);
        }, 300);
    }, [onSearchChange]);

    return (
        <div className="px-4 pb-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-14 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm text-slate-100 placeholder-slate-500"
                />
                <button
                    onClick={onToggleFilters}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${showFilters
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                </button>
            </div>

            {/* Filter Chips */}
            {showFilters && (
                <div className="mt-3 space-y-3">
                    {/* Sort Options */}
                    <div>
                        <p className="text-xs text-gray-400 mb-2">Sort by</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'popular', label: 'Popular' },
                                { value: 'newest', label: 'Newest' },
                                { value: 'name', label: 'Name' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => onSortChange(option.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${sortBy === option.value
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <p className="text-xs text-gray-400 mb-2">Minimum Rating</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'all', label: 'All' },
                                { value: '4', label: '4★+' },
                                { value: '3', label: '3★+' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => onRatingChange(option.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${ratingFilter === option.value
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Memoized version for better performance
export const MemoizedSearchAndFilters = React.memo(SearchAndFilters);
MemoizedSearchAndFilters.displayName = 'MemoizedSearchAndFilters';