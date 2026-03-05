// Simple Toast Vendor Dashboard - Only 3 Controls
import React, { useEffect, useState, useRef } from 'react';
import { Camera, DollarSign, ToggleLeft, ToggleRight, Package, Clock, CheckCircle, XCircle, Plus, Minus } from 'lucide-react';
import { ToastService, ToastVendor, ToastOrder } from '../../services/supabase/toast.service';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase/client';

interface ToastVendorDashboardProps {
    onShowProfile?: () => void;
}

export const ToastVendorDashboard: React.FC<ToastVendorDashboardProps> = ({ onShowProfile }) => {
    const toast = useToast();
    const [vendor, setVendor] = useState<ToastVendor | null>(null);
    const [orders, setOrders] = useState<ToastOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Form states
    const [price, setPrice] = useState(700);
    const [photoUrl, setPhotoUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadVendorData();
    }, []);

    const loadVendorData = async () => {
        try {
            setLoading(true);
            const vendorData = await ToastService.getMyVendorProfile();
            if (vendorData) {
                setVendor(vendorData);
                setPrice(vendorData.price || 700);
                setPhotoUrl(vendorData.photo_url || '');

                // Load orders
                const ordersData = await ToastService.getVendorOrders();
                setOrders(ordersData);
            }
        } catch (error) {
            console.error('Error loading vendor data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleOpen = async () => {
        if (!vendor) return;

        try {
            setUpdating(true);
            const updated = await ToastService.toggleOpen(!vendor.is_open);
            setVendor(updated);
            toast.showToast(updated.is_open ? 'Shop is now OPEN' : 'Shop is now CLOSED', 'success');
        } catch (error) {
            toast.showToast('Failed to update status', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handlePriceUpdate = async () => {
        if (!vendor) return;

        try {
            setUpdating(true);
            const updated = await ToastService.updateMyProfile({ price });
            setVendor(updated);
            toast.showToast('Price updated successfully!', 'success');
        } catch (error) {
            toast.showToast('Failed to update price', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !vendor) return;

        try {
            setUpdating(true);

            // Upload to Supabase Storage
            const fileName = `toast-vendors/${vendor.id}/${Date.now()}-${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vendor-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('vendor-images')
                .getPublicUrl(fileName);

            // Update vendor profile
            const updated = await ToastService.updateMyProfile({ photo_url: publicUrl });
            setVendor(updated);
            setPhotoUrl(publicUrl);
            toast.showToast('Photo updated successfully!', 'success');
        } catch (error) {
            console.error('Photo upload error:', error);
            toast.showToast('Failed to upload photo', 'error');
        } finally {
            setUpdating(false);
        }
    };

    const handleAcceptOrder = async (orderId: string) => {
        try {
            await ToastService.updateOrderStatus(orderId, 'accepted');
            loadVendorData();
            toast.showToast('Order accepted!', 'success');
        } catch (error) {
            toast.showToast('Failed to accept order', 'error');
        }
    };

    const handleCompleteOrder = async (orderId: string) => {
        try {
            await ToastService.updateOrderStatus(orderId, 'ready');
            loadVendorData();
            toast.showToast('Order marked as ready!', 'success');
        } catch (error) {
            toast.showToast('Failed to update order', 'error');
        }
    };

    // Get pending orders count
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const activeOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status));

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 p-4">
                <div className="animate-pulse">
                    <div className="h-32 bg-gray-800 rounded-xl mb-4"></div>
                    <div className="h-20 bg-gray-800 rounded-xl mb-4"></div>
                    <div className="h-20 bg-gray-800 rounded-xl mb-4"></div>
                </div>
            </div>
        );
    }

    if (!vendor) {
        return (
            <div className="min-h-screen bg-gray-900 p-4 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">You don't have a toast vendor account yet</p>
                    <a
                        href="#/toast-register"
                        className="inline-block bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600"
                    >
                        Register as Toast Vendor
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 pb-24">
            {/* Header Stats */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 pt-8">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{vendor.name}</h1>
                        <p className="text-green-100 text-sm">{vendor.hostel_location}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-bold text-white">₦{vendor.price}</p>
                        <p className="text-green-100 text-sm">per bread</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{pendingOrders}</p>
                        <p className="text-green-100 text-xs">Pending</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
                        <p className="text-green-100 text-xs">Active</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{vendor.rating}</p>
                        <p className="text-green-100 text-xs">Rating</p>
                    </div>
                </div>
            </div>

            {/* 3 Main Controls */}
            <div className="p-4 space-y-4">
                {/* Control 1: Upload Photo */}
                <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3 flex items-center">
                        <Camera className="w-5 h-5 mr-2 text-green-400" />
                        Upload Toast Photo
                    </h3>

                    <div className="flex items-center gap-4">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-600 flex items-center justify-center"
                        >
                            {photoUrl ? (
                                <img src={photoUrl} alt="Toast" className="w-full h-full object-cover" />
                            ) : (
                                <Camera className="w-8 h-8 text-gray-500" />
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={updating}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                        >
                            {updating ? 'Uploading...' : 'Choose Photo'}
                        </button>
                    </div>
                </div>

                {/* Control 2: Set Price */}
                <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                        Set Price
                    </h3>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-gray-700 rounded-lg">
                            <button
                                onClick={() => setPrice(Math.max(300, price - 50))}
                                className="p-3 text-white hover:bg-gray-600"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                            <span className="text-2xl font-bold text-white w-24 text-center">₦{price}</span>
                            <button
                                onClick={() => setPrice(Math.min(2000, price + 50))}
                                className="p-3 text-white hover:bg-gray-600"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={handlePriceUpdate}
                            disabled={updating || price === vendor.price}
                            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                        >
                            {updating ? 'Updating...' : 'Update Price'}
                        </button>
                    </div>
                </div>

                {/* Control 3: Toggle Open/Closed */}
                <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3 flex items-center">
                        {vendor.is_open ? (
                            <ToggleRight className="w-5 h-5 mr-2 text-green-400" />
                        ) : (
                            <ToggleLeft className="w-5 h-5 mr-2 text-red-400" />
                        )}
                        Status: {vendor.is_open ? 'OPEN' : 'CLOSED'}
                    </h3>

                    <button
                        onClick={handleToggleOpen}
                        disabled={updating}
                        className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center ${vendor.is_open
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                    >
                        {vendor.is_open ? (
                            <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Close Shop
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Open Shop
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Orders Section */}
            <div className="p-4">
                <h3 className="text-white font-bold mb-3 flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Recent Orders
                </h3>

                {orders.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl p-8 text-center">
                        <p className="text-gray-400">No orders yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.slice(0, 5).map(order => (
                            <div key={order.id} className="bg-gray-800 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-white font-medium">{order.customer_name}</p>
                                        <p className="text-gray-400 text-sm">{order.customer_hostel}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-400 font-bold">₦{order.total_price}</p>
                                        <p className="text-gray-400 text-xs">×{order.quantity}</p>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="mb-3">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            order.status === 'accepted' ? 'bg-blue-500/20 text-blue-400' :
                                                order.status === 'preparing' ? 'bg-purple-500/20 text-purple-400' :
                                                    order.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => handleAcceptOrder(order.id)}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium"
                                    >
                                        Accept Order
                                    </button>
                                )}
                                {order.status === 'accepted' && (
                                    <button
                                        onClick={() => handleCompleteOrder(order.id)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
                                    >
                                        Mark as Ready
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToastVendorDashboard;
