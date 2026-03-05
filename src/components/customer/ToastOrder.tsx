// Fast Order - 1-tap toast ordering with extras
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Phone, MapPin, Plus, Minus, Check, CreditCard } from 'lucide-react';
import { ToastService, ToastVendor, ToastOrder } from '../../services/supabase/toast.service';
import { useToast } from '../../contexts/ToastContext';
import { Skeleton } from '../shared/LoadingSkeleton';

interface ToastOrderPageProps {
    vendor: ToastVendor;
    onBack: () => void;
    onOrderSuccess: (order: ToastOrder) => void;
}

export const ToastOrderPage: React.FC<ToastOrderPageProps> = ({
    vendor,
    onBack,
    onOrderSuccess
}) => {
    const toast = useToast();
    const [quantity, setQuantity] = useState(1);
    const [extras, setExtras] = useState({
        butter: false,
        egg: false,
        tea: false
    });
    const [notes, setNotes] = useState('');
    const [ordering, setOrdering] = useState(false);

    // Calculate totals
    const basePrice = vendor.price || 700;
    const extrasConfig = vendor.extras || { butter: 100, egg: 200, tea: 300 };

    const extrasTotal =
        (extras.butter ? (extrasConfig.butter || 100) : 0) +
        (extras.egg ? (extrasConfig.egg || 200) : 0) +
        (extras.tea ? (extrasConfig.tea || 300) : 0);

    const subtotal = (basePrice + extrasTotal) * quantity;
    const deliveryFee = 100;
    const total = subtotal + deliveryFee;

    const handleOrder = async () => {
        if (!vendor.is_open) {
            toast.showToast('This vendor is currently closed', 'error');
            return;
        }

        try {
            setOrdering(true);
            const order = await ToastService.createOrder({
                vendor_id: vendor.id,
                quantity,
                extras,
                notes
            });
            toast.showToast('Order placed successfully!', 'success');
            onOrderSuccess(order);
        } catch (error: any) {
            console.error('Order error:', error);
            toast.showToast(error.message || 'Failed to place order', 'error');
        } finally {
            setOrdering(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 z-10 p-4 border-b border-gray-800">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-xl font-bold text-white ml-2">Fast Order</h1>
                </div>
            </div>

            <div className="p-4 pb-32">
                {/* Vendor Card */}
                <div className="bg-gray-800 rounded-xl overflow-hidden mb-6">
                    {/* Image */}
                    <div className="h-40 bg-gray-700 relative">
                        {vendor.photo_url ? (
                            <img
                                src={vendor.photo_url}
                                alt={vendor.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-600 to-orange-600">
                                <span className="text-6xl">🍞</span>
                            </div>
                        )}
                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-medium ${vendor.is_open ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                            {vendor.is_open ? '🟢 Open' : '🔴 Closed'}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                        <h2 className="text-2xl font-bold text-white">{vendor.name}</h2>
                        <div className="flex items-center mt-2 text-gray-400">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{vendor.hostel_location}</span>
                        </div>
                        <div className="flex items-center mt-1 text-gray-400">
                            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                            <span className="text-white font-medium">{vendor.rating}</span>
                            <span className="ml-1">({vendor.total_ratings} reviews)</span>
                        </div>
                    </div>
                </div>

                {/* Main Product - Toast Bread */}
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-bold text-lg">Toast Bread</h3>
                            <p className="text-gray-400 text-sm">Classic toasted bread</p>
                        </div>
                        <p className="text-green-400 font-bold text-xl">₦{basePrice}</p>
                    </div>
                </div>

                {/* Extras */}
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-bold mb-3">Add Extras</h3>

                    <div className="space-y-3">
                        {/* Butter */}
                        <button
                            onClick={() => setExtras(prev => ({ ...prev, butter: !prev.butter }))}
                            className={`w-full flex justify-between items-center p-3 rounded-lg border-2 transition-all ${extras.butter
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-gray-700 bg-gray-700/30'
                                }`}
                        >
                            <div className="flex items-center">
                                <span className="text-2xl mr-3">🧈</span>
                                <div className="text-left">
                                    <p className="text-white font-medium">Butter</p>
                                    <p className="text-gray-400 text-sm">Add butter to your toast</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="text-green-400 font-bold mr-3">+₦{extrasConfig.butter || 100}</span>
                                {extras.butter && <Check className="w-5 h-5 text-green-500" />}
                            </div>
                        </button>

                        {/* Egg */}
                        <button
                            onClick={() => setExtras(prev => ({ ...prev, egg: !prev.egg }))}
                            className={`w-full flex justify-between items-center p-3 rounded-lg border-2 transition-all ${extras.egg
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-gray-700 bg-gray-700/30'
                                }`}
                        >
                            <div className="flex items-center">
                                <span className="text-2xl mr-3">🥚</span>
                                <div className="text-left">
                                    <p className="text-white font-medium">Egg</p>
                                    <p className="text-gray-400 text-sm">Fried or boiled egg</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="text-green-400 font-bold mr-3">+₦{extrasConfig.egg || 200}</span>
                                {extras.egg && <Check className="w-5 h-5 text-green-500" />}
                            </div>
                        </button>

                        {/* Tea */}
                        <button
                            onClick={() => setExtras(prev => ({ ...prev, tea: !prev.tea }))}
                            className={`w-full flex justify-between items-center p-3 rounded-lg border-2 transition-all ${extras.tea
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-gray-700 bg-gray-700/30'
                                }`}
                        >
                            <div className="flex items-center">
                                <span className="text-2xl mr-3">🍵</span>
                                <div className="text-left">
                                    <p className="text-white font-medium">Tea</p>
                                    <p className="text-gray-400 text-sm">Hot tea packet</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="text-green-400 font-bold mr-3">+₦{extrasConfig.tea || 300}</span>
                                {extras.tea && <Check className="w-5 h-5 text-green-500" />}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Quantity */}
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-bold mb-3">Quantity</h3>
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white text-xl hover:bg-gray-600"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <span className="text-white font-bold text-2xl mx-6">{quantity}</span>
                        <button
                            onClick={() => setQuantity(Math.min(10, quantity + 1))}
                            className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white text-xl hover:bg-gray-600"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-bold mb-2">Order Notes (Optional)</h3>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any special instructions..."
                        className="w-full bg-gray-700 text-white rounded-lg p-3 placeholder-gray-500 border-none focus:ring-2 focus:ring-green-500"
                        rows={2}
                    />
                </div>

                {/* Order Summary */}
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                    <h3 className="text-white font-bold mb-3">Order Summary</h3>
                    <div className="space-y-2 text-gray-400">
                        <div className="flex justify-between">
                            <span>Toast Bread × {quantity}</span>
                            <span className="text-white">₦{basePrice * quantity}</span>
                        </div>
                        {extrasTotal > 0 && (
                            <div className="flex justify-between">
                                <span>Extras</span>
                                <span className="text-white">₦{extrasTotal * quantity}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Delivery Fee</span>
                            <span className="text-white">₦{deliveryFee}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between">
                            <span className="text-white font-bold">Total</span>
                            <span className="text-green-400 font-bold text-xl">₦{total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Order Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-800">
                <button
                    onClick={handleOrder}
                    disabled={ordering || !vendor.is_open}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${vendor.is_open
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {ordering ? (
                        <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                            Processing...
                        </span>
                    ) : !vendor.is_open ? (
                        'Vendor is Closed'
                    ) : (
                        <span className="flex items-center justify-center">
                            <CreditCard className="w-5 h-5 mr-2" />
                            Order Now - ₦{total}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ToastOrderPage;
