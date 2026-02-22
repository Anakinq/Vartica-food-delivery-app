// src/components/customer/CafeteriaSection.tsx
// Optimized Cafeteria section component

import React, { useMemo } from 'react';
import { Cafeteria } from '../../lib/supabase';
import { LazyImage } from '../shared/LazyImage';
import { Star, MapPin, Clock } from 'lucide-react';

interface CafeteriaSectionProps {
    cafeterias: Cafeteria[];
    cafeteriaStatus: Record<string, boolean>;
    onCafeteriaClick: (id: string, name: string) => void;
    globalSearchQuery: string;
    sortBy: string;
}

// Memoized Cafeteria Card Component
const CafeteriaCard = React.memo(({
    cafeteria,
    isOpen,
    onClick
}: {
    cafeteria: Cafeteria;
    isOpen: boolean;
    onClick: () => void;
}) => {
    const getImagePath = (cafeteria: Cafeteria) => {
        const nameMap: Record<string, string> = {
            'Cafeteria 1': 'caf 1',
            'Cafeteria 2': 'caf 2',
            'Med Cafeteria': 'med caf',
            'Smoothie Shack': 'smoothie shack',
            'Staff Cafeteria': 'staff caf',
            'Captain Cook': 'captain cook'
        };

        const mappedName = nameMap[cafeteria.name];
        if (mappedName) {
            const extensionMap: Record<string, string> = {
                'caf 1': '.png',
                'caf 2': '.png',
                'staff caf': '.png',
                'captain cook': '.png',
                'med caf': '.jpeg',
                'smoothie shack': '.png'
            };
            const ext = extensionMap[mappedName] || '.jpg';
            return `/images/${mappedName}${ext}`;
        }

        return '/images/1.jpg';
    };

    return (
        <div
            onClick={onClick}
            className="bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-700 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10 hover:border-green-500/30 w-[85vw] max-w-sm snap-start flex-shrink-0"
        >
            <div className="relative h-20">
                <LazyImage
                    src={cafeteria.image_url || getImagePath(cafeteria)}
                    alt={cafeteria.name}
                    className="w-full h-full object-cover"
                    placeholder="https://placehold.co/600x400/1e293b/64748b?text=No+Image"
                    priority={false}
                />
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${isOpen
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        {isOpen ? 'Open' : 'Closed'}
                    </span>
                </div>
            </div>
            <div className="p-3">
                <h3 className="font-semibold text-slate-100 text-sm truncate mb-1">{cafeteria.name}</h3>
                <div className="flex items-center text-xs text-slate-400 mb-2">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    <span className="truncate">Central Campus</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-xs font-medium text-slate-200">4.5</span>
                        <span className="ml-1 text-xs text-slate-500">(187)</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        <span>20-25 min</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

CafeteriaCard.displayName = 'CafeteriaCard';

export const CafeteriaSection: React.FC<CafeteriaSectionProps> = ({
    cafeterias,
    cafeteriaStatus,
    onCafeteriaClick,
    globalSearchQuery,
    sortBy
}) => {
    // Optimized filtering and sorting
    const filteredCafeterias = useMemo(() => {
        let result = [...cafeterias];

        // Apply search filter
        if (globalSearchQuery.trim()) {
            const searchLower = globalSearchQuery.toLowerCase();
            result = result.filter(c => c.name.toLowerCase().includes(searchLower));
        }

        // Apply sorting
        switch (sortBy) {
            case 'newest':
                result.sort((a, b) =>
                    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
                );
                break;
            case 'name':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                // popular - keep default order
                break;
        }

        return result;
    }, [cafeterias, globalSearchQuery, sortBy]);

    if (filteredCafeterias.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                    <Star className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                    {globalSearchQuery ? 'No cafeterias found' : 'No cafeterias available'}
                </h3>
                <p className="text-gray-400">
                    {globalSearchQuery ? 'Try adjusting your search' : 'Check back later'}
                </p>
            </div>
        );
    }

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between px-4 mb-5">
                <h2 className="text-xl font-bold text-white">Available Cafeterias</h2>
                <button
                    className="text-green-400 text-sm font-semibold hover:text-green-300"
                    onClick={() => window.location.hash = '#/cafeterias'}
                >
                    See All
                </button>
            </div>
            <div className="flex overflow-x-auto space-x-4 px-4 hide-scrollbar snap-x snap-mandatory">
                {filteredCafeterias.map(cafeteria => (
                    <CafeteriaCard
                        key={cafeteria.id}
                        cafeteria={cafeteria}
                        isOpen={cafeteriaStatus[cafeteria.id] !== false}
                        onClick={() => onCafeteriaClick(cafeteria.id, cafeteria.name)}
                    />
                ))}
            </div>
        </section>
    );
};