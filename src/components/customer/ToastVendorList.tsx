// Toast Vendors List - Show vendors inside a specific hostel
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Star, Phone, MapPin, Clock, Check } from 'lucide-react';
import { ToastService, ToastVendor } from '../../services/supabase/toast.service';
import { Skeleton } from '../shared/LoadingSkeleton';

interface ToastVendorListProps {
    hostelLocation: string;
    onBack: () => void;
    onSelectVendor: (vendor: ToastVendor) => void;
}

export const ToastVendorList: React.FC<ToastVendorListProps> = ({
    hostelLocation,
    onBack,
    onSelectVendor
}) => {
    const [vendors, setVendors] = useState<ToastVendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVendors();
    }, [hostelLocation]);

    const loadVendors = async () => {
        try {
            setLoading(true);
            const data = await ToastService.getVendorsByHostel(hostelLocation);
            setVendors(data);
        } catch (error) {
            console.error('Error loading vendors:', error);
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
                <Skeleton className="h-32 w-full rounded-xl mb-4" />
                <Skeleton className="h-32 w-full rounded-xl mb-4" />
                <Skeleton className="h-32 w-full rounded-xl mb-4" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 z-10 p-4 border-b border-gray-800">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="ml-2">
                        <h1 className="text-xl font-bold text-white">{hostelLocation}</h1>
                        <p className="text-sm text-gray-400">{vendors.length} toast vendor{vendors.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 pb-24">
                {vendors.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                            <MapPin className="w-10 h-10 text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Toast Vendors</h3>
                        <p className="text-gray-400">No toast vendors available at this hostel yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {vendors.map(vendor => (
                            <div
                                key={vendor.id}
                                onClick={() => onSelectVendor(vendor)}
                                className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-750 hover:border-green-500/30 border border-transparent transition-all"
                            >
                                {/* Vendor Image */}
                                <div className="h-32 bg-gray-700 relative">
                                    {vendor.photo_url ? (
                                        <img
                                            src={vendor.photo_url}
                                            alt={vendor.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-600 to-orange-600">
                                            <span className="text-4xl">🍞</span>
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${vendor.is_open
                                            ? 'bg-green-500 text-white'
                                            : 'bg-red-500 text-white'
                                        }`}>
                                        {vendor.is_open ? 'Open' : 'Closed'}
                                    </div>
                                </div>

                                {/* Vendor Info */}
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-white font-bold text-lg">{vendor.name}</h3>
                                            <div className="flex items-center mt-1">
                                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                                <span className="text-white text-sm ml-1 font-medium">{vendor.rating}</span>
                                                <span className="text-gray-500 text-xs ml-1">({vendor.total_ratings} reviews)</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-green-400 font-bold text-xl">₦{vendor.price}</p>
                                            <p className="text-gray-500 text-xs">per bread</p>
                                        </div>
                                    </div>

                                    {/* Extras Preview */}
                                    {vendor.extras && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {vendor.extras.butter && (
                                                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                                                    Butter +₦{vendor.extras.butter}
                                                </span>
                                            )}
                                            {vendor.extras.egg && (
                                                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                                                    Egg +₦{vendor.extras.egg}
                                                </span>
                                            )}
                                            {vendor.extras.tea && (
                                                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                                                    Tea +₦{vendor.extras.tea}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Quick Order Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectVendor(vendor);
                                        }}
                                        className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-lg transition-colors"
                                    >
                                        {vendor.is_open ? 'Order Now' : 'View Details'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToastVendorList;
