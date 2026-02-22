// src/components/customer/VendorSection.tsx
// Optimized Vendor section component

import React, { useMemo } from 'react';
import { Vendor } from '../../lib/supabase/types';
import { LazyImage } from '../shared/LazyImage';
import { Star, Moon } from 'lucide-react';

interface VendorSectionProps {
    vendors: Vendor[];
    vendorRatings: Record<string, { avgRating: number; reviewCount: number }>;
    onVendorClick: (id: string, name: string) => void;
    globalSearchQuery: string;
    ratingFilter: string;
    title: string;
    showLateNightBadge?: boolean;
    seeAllLink?: string;
}

// Memoized Vendor Card Component
const VendorCard = React.memo(({
    vendor,
    rating,
    showLateNightBadge = false,
    onClick
}: {
    vendor: Vendor;
    rating?: { avgRating: number; reviewCount: number };
    showLateNightBadge?: boolean;
    onClick: () => void;
}) => {
    const getImagePath = (vendorId: string) => {
        // Simple mapping for vendor images
        const index = parseInt(vendorId.slice(-1), 16) % 10;
        return `/images/${index + 1}.jpg`;
    };

    return (
        <div
            onClick={onClick}
            className="bg-slate-800 rounded-xl overflow-hidden shadow-md border border-slate-700 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10 hover:border-green-500/30 w-[85vw] max-w-sm snap-start flex-shrink-0"
        >
            <div className="relative h-20">
                <LazyImage
                    src={vendor.image_url || getImagePath(vendor.id)}
                    alt={vendor.store_name}
                    className="w-full h-full object-cover"
                    placeholder="https://placehold.co/600x400/1e293b/64748b?text=No+Image"
                    priority={false}
                />
                {showLateNightBadge && (
                    <div className="absolute top-2 left-2">
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full flex items-center border border-purple-500/30">
                            <Moon className="w-3 h-3 mr-1" /> Late Night
                        </span>
                    </div>
                )}
                {/* Verified badge - vendors are always considered verified */}
                {(vendor.vendor_type === 'student' || vendor.vendor_type === 'late_night') && (
                    <div className="absolute top-2 right-2">
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-medium border border-blue-500/30">
                            ✓ Verified
                        </span>
                    </div>
                )}
            </div>
            <div className="p-3">
                <h3 className="font-semibold text-slate-100 text-sm truncate mb-1">{vendor.store_name}</h3>
                <p className="text-xs text-slate-400 line-clamp-1 mb-2">{vendor.description || 'Student Vendor'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    {rating && rating.reviewCount > 0 ? (
                        <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="ml-1 text-xs font-medium text-slate-200">{rating.avgRating.toFixed(1)}</span>
                            <span className="ml-1 text-xs text-slate-500">({rating.reviewCount})</span>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400">Be the first to review!</div>
                    )}
                    {showLateNightBadge && (
                        <div className="text-xs text-purple-400 font-medium">
                            9pm - 2am
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

VendorCard.displayName = 'VendorCard';

export const VendorSection: React.FC<VendorSectionProps> = ({
    vendors,
    vendorRatings,
    onVendorClick,
    globalSearchQuery,
    ratingFilter,
    title,
    showLateNightBadge = false,
    seeAllLink
}) => {
    // Optimized filtering
    const filteredVendors = useMemo(() => {
        let result = [...vendors];

        // Apply search filter
        if (globalSearchQuery.trim()) {
            const searchLower = globalSearchQuery.toLowerCase();
            result = result.filter(v =>
                v.store_name.toLowerCase().includes(searchLower)
            );
        }

        // Apply rating filter
        if (ratingFilter !== 'all') {
            const minRating = parseFloat(ratingFilter);
            result = result.filter(v => {
                const rating = vendorRatings[v.id];
                return rating && rating.avgRating >= minRating;
            });
        }

        return result;
    }, [vendors, globalSearchQuery, ratingFilter, vendorRatings]);

    if (filteredVendors.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                    <Star className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                    {globalSearchQuery ? 'No vendors found' : 'No vendors available'}
                </h3>
                <p className="text-gray-400">
                    {globalSearchQuery ? 'Try adjusting your search or filters' : 'Check back later for new vendors'}
                </p>
            </div>
        );
    }

    return (
        <section className="mb-10">
            <div className="flex items-center justify-between px-4 mb-5">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {seeAllLink && (
                    <button
                        className="text-green-400 text-sm font-semibold hover:text-green-300"
                        onClick={() => window.location.hash = seeAllLink}
                    >
                        See All
                    </button>
                )}
            </div>
            <div className="flex overflow-x-auto space-x-4 px-4 hide-scrollbar snap-x snap-mandatory">
                {filteredVendors.map(vendor => (
                    <VendorCard
                        key={vendor.id}
                        vendor={vendor}
                        rating={vendorRatings[vendor.id]}
                        showLateNightBadge={showLateNightBadge}
                        onClick={() => onVendorClick(vendor.id, vendor.store_name)}
                    />
                ))}
            </div>
        </section>
    );
};