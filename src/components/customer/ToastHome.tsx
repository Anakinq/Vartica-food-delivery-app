// Toast Home Page - Browse hostels with toast vendors
import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Star, Clock, ChevronRight, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ToastService, HostelWithVendors, ToastVendor } from '../../services/supabase/toast.service';
import { Skeleton } from '../shared/LoadingSkeleton';

interface ToastHomeProps {
    onBack: () => void;
    onSelectHostel: (hostel: string) => void;
}

export const ToastHome: React.FC<ToastHomeProps> = ({ onBack, onSelectHostel }) => {
    const { profile } = useAuth();
    const [hostels, setHostels] = useState<HostelWithVendors[]>([]);
    const [loading, setLoading] = useState(true);
    const [nearbyHostel, setNearbyHostel] = useState<string | null>(null);

    // Get user's hostel
    const userHostel = profile?.hostel_location;

    useEffect(() => {
        loadHostels();
    }, []);

    const loadHostels = async () => {
        try {
            setLoading(true);
            const data = await ToastService.getHostelsWithVendors();
            setHostels(data);

            // Set nearby hostel to user's hostel if they have vendors
            if (userHostel) {
                const userHostelHasVendors = data.find(h => h.hostel_location === userHostel);
                if (userHostelHasVendors) {
                    setNearbyHostel(userHostel);
                }
            }
        } catch (error) {
            console.error('Error loading toast hostels:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 p-4">
                <div className="flex items-center mb-6">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-32 ml-2" />
                </div>
                <Skeleton className="h-24 w-full rounded-xl mb-4" />
                <Skeleton className="h-24 w-full rounded-xl mb-4" />
                <Skeleton className="h-24 w-full rounded-xl mb-4" />
            </div>
        );
    }

    // Separate user's hostel from others
    const nearbyHostelData = hostels.find(h => h.hostel_location === nearbyHostel);
    const otherHostels = hostels.filter(h => h.hostel_location !== nearbyHostel);

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 z-10 p-4 border-b border-gray-800">
                <div className="flex items-center mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-xl font-bold text-white ml-2">🍞 Order Toast</h1>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-xl p-3">
                        <p className="text-xl sm:text-2xl font-bold text-green-400">{hostels.length}</p>
                        <p className="text-xs text-gray-400">Hostels Available</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-3">
                        <p className="text-xl sm:text-2xl font-bold text-orange-400">
                            {hostels.reduce((acc, h) => acc + h.vendor_count, 0)}
                        </p>
                        <p className="text-xs text-gray-400">Toast Vendors</p>
                    </div>
                </div>
            </div>

            <div className="p-4 pb-24">
                {/* Near You Section */}
                {nearbyHostelData && (
                    <div className="mb-6">
                        <div className="flex items-center mb-3">
                            <MapPin className="w-4 h-4 text-green-400 mr-1" />
                            <h2 className="text-lg font-bold text-white">Near You</h2>
                        </div>

                        <div
                            onClick={() => onSelectHostel(nearbyHostelData.hostel_location)}
                            className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 cursor-pointer hover:from-green-500 hover:to-green-600 transition-all"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-white font-bold text-lg">
                                        {nearbyHostelData.hostel_location}
                                    </h3>
                                    <p className="text-green-100 text-sm">
                                        {nearbyHostelData.vendor_count} toast vendor{nearbyHostelData.vendor_count !== 1 ? 's' : ''} available
                                    </p>
                                </div>
                                <ChevronRight className="w-6 h-6 text-white" />
                            </div>

                            {/* Preview vendors */}
                            <div className="mt-3 flex gap-2 overflow-x-auto">
                                {nearbyHostelData.vendors.slice(0, 3).map(vendor => (
                                    <div key={vendor.id} className="bg-white/20 rounded-lg p-2 min-w-[80px]">
                                        <p className="text-white text-xs font-medium truncate">{vendor.name}</p>
                                        <p className="text-green-100 text-xs">₦{vendor.price}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* All Hostels */}
                <div>
                    <h2 className="text-lg font-bold text-white mb-3">All Hostels</h2>

                    {otherHostels.length === 0 && !nearbyHostelData && (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                                <MapPin className="w-10 h-10 text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Toast Vendors Yet</h3>
                            <p className="text-gray-400">Be the first to register as a toast vendor!</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {otherHostels.map(hostel => (
                            <div
                                key={hostel.hostel_location}
                                onClick={() => onSelectHostel(hostel.hostel_location)}
                                className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-750 hover:border-green-500/30 border border-transparent transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-white font-medium">
                                            {hostel.hostel_location}
                                        </h3>
                                        <p className="text-gray-400 text-sm">
                                            {hostel.vendor_count} vendor{hostel.vendor_count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-400 text-sm font-medium mr-1">
                                            View
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                    </div>
                                </div>

                                {/* Vendor preview */}
                                <div className="mt-3 flex gap-2">
                                    {hostel.vendors.slice(0, 3).map(vendor => (
                                        <div key={vendor.id} className="bg-gray-700 rounded-lg px-2 py-1">
                                            <p className="text-white text-xs">{vendor.name}</p>
                                        </div>
                                    ))}
                                    {hostel.vendor_count > 3 && (
                                        <div className="bg-gray-700 rounded-lg px-2 py-1">
                                            <p className="text-gray-400 text-xs">+{hostel.vendor_count - 3} more</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ToastHome;
