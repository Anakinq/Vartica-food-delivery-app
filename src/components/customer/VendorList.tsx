import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, MapPin, Clock, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Vendor } from '../../lib/supabase/types';
import { supabase } from '../../lib/supabase/client';
import { LazyImage } from '../common/LazyImage';
import { CardSkeleton } from '../shared/LoadingSkeleton';
import { VendorReviewService } from '../../services/supabase/vendor.service';

interface VendorListProps {
    onBack: () => void;
}

export const VendorList: React.FC<VendorListProps> = ({ onBack }) => {
    const { profile } = useAuth();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [lateNightVendors, setLateNightVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [vendorRatings, setVendorRatings] = useState<Record<string, { avgRating: number; reviewCount: number }>>({});

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                const { data, error } = await supabase
                    .from('vendors')
                    .select('*')
                    .eq('is_active', true)
                    .order('store_name');

                if (error) throw error;

                if (data) {
                    const students = data.filter(v => v.vendor_type === 'student');
                    const lateNight = data.filter(v => v.vendor_type === 'late_night');
                    setVendors(students);
                    setLateNightVendors(lateNight);

                    const allVendors = [...students, ...lateNight];
                    const ratings: Record<string, { avgRating: number; reviewCount: number }> = {};

                    for (const vendor of allVendors) {
                        try {
                            const [avgRating, reviewCount] = await Promise.all([
                                VendorReviewService.getVendorAverageRating(vendor.id),
                                VendorReviewService.getVendorReviewCount(vendor.id)
                            ]);
                            ratings[vendor.id] = { avgRating, reviewCount };
                        } catch (error) {
                            ratings[vendor.id] = { avgRating: 0, reviewCount: 0 };
                        }
                    }
                    setVendorRatings(ratings);
                }
            } catch (error) {
                console.error('Error fetching vendors:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVendors();
    }, []);

    const getImagePath = (vendorId: string, vendorType?: string) => {
        if (vendorType === 'late_night') {
            return '/images/latenightvendor.jpg';
        }

        const index = vendors.findIndex(v => v.id === vendorId);
        if (index !== -1) {
            const cafeteriaCount = 0; // We don't have cafeterias here, so start from 1
            return `/images/${index + 1}.jpg`;
        }

        return '/images/1.jpg';
    };

    const renderVendorCard = (vendor: Vendor, isLateNight: boolean = false) => {
        const rating = vendorRatings[vendor.id];
        return (
            <div
                key={vendor.id}
                onClick={() => window.location.hash = `#/vendor/${vendor.id}`}
                className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg shadow-black/20 border border-gray-700 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-green-500/10 hover:border-green-500/50"
            >
                <div className="relative h-24">
                    <LazyImage
                        src={vendor.image_url || getImagePath(vendor.id, vendor.vendor_type)}
                        alt={vendor.store_name}
                        className="w-full h-full object-cover"
                        placeholder="https://placehold.co/600x400/1e293b/64748b?text=No+Image"
                    />
                    {isLateNight && (
                        <div className="absolute top-3 left-3">
                            <span className="bg-purple-500/20 text-purple-400 text-xs px-3 py-1.5 rounded-full flex items-center border border-purple-500/30">
                                <Moon className="w-3.5 h-3.5 mr-1.5" /> Late Night
                            </span>
                        </div>
                    )}
                    {/* Verified badge - vendors are always considered verified */}
                    {(vendor.vendor_type === 'student' || vendor.vendor_type === 'late_night') && (
                        <div className="absolute top-3 right-3">
                            <span className="bg-blue-500/20 text-blue-400 text-xs px-3 py-1.5 rounded-full font-semibold border border-blue-500/30">
                                ✓ Verified
                            </span>
                        </div>
                    )}
                </div>
                <div className="p-3">
                    <h3 className="font-bold text-white text-base truncate">{vendor.store_name}</h3>
                    <p className="text-sm text-gray-400 mt-1.5 line-clamp-1">{vendor.description || 'Student Vendor'}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                        {rating && rating.reviewCount > 0 ? (
                            <div className="flex items-center">
                                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                                <span className="ml-1.5 text-sm font-semibold text-white">{rating.avgRating.toFixed(1)}</span>
                                <span className="ml-1.5 text-xs text-gray-500">({rating.reviewCount})</span>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400">Be the first to review!</div>
                        )}
                        {isLateNight && (
                            <div className="text-xs text-purple-400 font-semibold">
                                9pm - 2am
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#121212]">
            {/* Header */}
            <header className="bg-[#121212] border-b border-gray-800 sticky top-0 z-40">
                <div className="px-4 pt-4">
                    <div className="flex items-center mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center space-x-2 text-gray-300 hover:text-green-400 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Back</span>
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold text-white">All Trusted Vendors</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pb-16 pt-4">
                {loading ? (
                    <div className="grid grid-cols-1 gap-4 px-4">
                        {[...Array(6)].map((_, index) => (
                            <div key={index} className="bg-gray-800 rounded-2xl p-4">
                                <CardSkeleton />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Student Vendors */}
                        {vendors.length > 0 && (
                            <div className="px-4">
                                <h2 className="text-xl font-bold text-white mb-4">Student Vendors</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {vendors.map(vendor => (
                                        <div key={vendor.id}>
                                            {renderVendorCard(vendor, false)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Late Night Vendors */}
                        {lateNightVendors.length > 0 && (
                            <div className="px-4">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Moon className="w-5 h-5 text-purple-400" />
                                    <h2 className="text-xl font-bold text-white">Late Night Vendors</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {lateNightVendors.map(vendor => (
                                        <div key={vendor.id}>
                                            {renderVendorCard(vendor, true)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Message if no vendors */}
                        {vendors.length === 0 && lateNightVendors.length === 0 && (
                            <div className="text-center py-12 px-4">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                    <MapPin className="w-10 h-10 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Vendors Available</h3>
                                <p className="text-gray-400">There are currently no trusted vendors in the system.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorList;