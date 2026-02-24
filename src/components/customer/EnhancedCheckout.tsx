// Enhanced Checkout Component with Better Mobile Responsiveness
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, AlertCircle, X, RefreshCw, MapPin, Truck, Store } from 'lucide-react';
import { PaystackButton } from 'react-paystack';
import { supabase, MenuItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { BackButton } from '../shared/BackButton';
import {
    HOSTEL_DELIVERY_FEES,
    BUSINESS_CONSTANTS,
    MIN_NGN_VALUE
} from '../../utils/constants';

interface CartItem extends MenuItem {
    quantity: number;
}

interface EnhancedCheckoutProps {
    items: CartItem[];
    subtotal: number;
    deliveryFee: number;
    packCount?: number;
    onBack: () => void;
    onClose: () => void;
    onSuccess: () => void;
}

export type DeliveryMethod = 'vendor' | 'agent';

export const EnhancedCheckout: React.FC<EnhancedCheckoutProps> = ({
    items,
    subtotal,
    deliveryFee,
    packCount = 0,
    onBack,
    onClose,
    onSuccess,
}) => {
    // Graceful error handling
    const effectiveSubtotal = typeof subtotal === 'number' && !isNaN(subtotal) ? subtotal : 0;
    const effectiveDeliveryFee = typeof deliveryFee === 'number' && !isNaN(deliveryFee) ? deliveryFee : 0;

    const { profile } = useAuth();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        deliveryAddress: '',
        deliveryNotes: '',
        scheduledFor: '',
        promoCode: ''
    });

    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('vendor');
    const [loading, setLoading] = useState(false);
    const [scriptLoading, setScriptLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [discount, setDiscount] = useState(0);
    const [deliveryFeeDiscount, setDeliveryFeeDiscount] = useState(0);
    const [promoError, setPromoError] = useState('');
    const [showDeliveryMethodChoice, setShowDeliveryMethodChoice] = useState(false);

    // Calculate totals
    const packTotal = packCount * BUSINESS_CONSTANTS.PACK_PRICE;
    const effectiveDeliveryFeeCalc = Math.max(0, effectiveDeliveryFee - deliveryFeeDiscount);
    const effectiveTotal = Math.max(MIN_NGN_VALUE, effectiveSubtotal + packTotal + effectiveDeliveryFeeCalc - discount);

    // Get delivery fee based on hostel
    const hostelBasedDeliveryFee = HOSTEL_DELIVERY_FEES[formData.deliveryAddress as keyof typeof HOSTEL_DELIVERY_FEES] || effectiveDeliveryFee;

    // Load Paystack script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => setScriptLoading(false);
        script.onerror = () => {
            setError('Failed to load payment gateway. Please try again.');
            setScriptLoading(false);
        };
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Check if delivery method choice is needed
    useEffect(() => {
        if (items.length > 0 && items[0].seller_id) {
            supabase
                .from('vendors')
                .select('delivery_modes')
                .eq('id', items[0].seller_id)
                .single()
                .then(({ data, error }) => {
                    if (!error && data?.delivery_modes === 'both') {
                        setShowDeliveryMethodChoice(true);
                    }
                });
        }
    }, [items]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (field === 'deliveryAddress') {
            setPromoError('');
        }
    };

    const handleApplyPromo = async () => {
        if (!formData.promoCode.trim()) {
            setPromoError('Please enter a promo code');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('promos')
                .select('*')
                .eq('code', formData.promoCode.trim().toUpperCase())
                .eq('is_active', true)
                .gte('expires_at', new Date().toISOString())
                .single();

            if (error || !data) {
                setPromoError('Invalid or expired promo code');
                return;
            }

            if (data.min_order_value && effectiveSubtotal < data.min_order_value) {
                setPromoError(`Minimum order value is ₦${data.min_order_value}`);
                return;
            }

            // Apply discount
            if (data.discount_type === 'percentage') {
                const discountAmount = (effectiveSubtotal * data.discount_value) / 100;
                setDiscount(Math.min(discountAmount, data.max_discount || Infinity));
            } else {
                setDiscount(data.discount_value);
            }

            // Apply delivery fee discount if available
            if (data.free_delivery) {
                setDeliveryFeeDiscount(hostelBasedDeliveryFee);
            }

            setPromoError('');
            showToast('Promo code applied successfully!', 'success');
        } catch (err) {
            setPromoError('Failed to apply promo code');
        }
    };

    const initializePaystackPayment = useCallback(() => {
        if (!profile?.email) {
            setError('Profile email is required for payment');
            return;
        }

        if (effectiveTotal < MIN_NGN_VALUE) {
            setError(`Minimum payment amount is ₦${MIN_NGN_VALUE}`);
            return;
        }

        if (!formData.deliveryAddress) {
            setError('Please select your hostel');
            return;
        }

        setError('');

        const handler = PaystackPop.setup({
            key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here',
            email: profile.email,
            amount: Math.round(effectiveTotal * 100), // Paystack uses kobo
            currency: 'NGN',
            ref: '' + Math.floor(Math.random() * 1000000000 + 1),
            metadata: {
                custom_fields: [
                    {
                        display_name: "Hostel",
                        variable_name: "hostel",
                        value: formData.deliveryAddress
                    },
                    {
                        display_name: "Delivery Notes",
                        variable_name: "delivery_notes",
                        value: formData.deliveryNotes
                    }
                ]
            },
            callback: async (response: any) => {
                await handlePaymentSuccess(response);
            },
            onClose: () => {
                setLoading(false);
            },
        });

        handler.openIframe();
    }, [profile, effectiveTotal, formData, showToast]);

    const handlePaymentSuccess = async (response: any) => {
        setLoading(true);
        setError('');

        try {
            const orderData = {
                user_id: profile!.id,
                seller_id: items[0].seller_id,
                items: items.map(item => ({
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: effectiveSubtotal,
                delivery_fee: effectiveDeliveryFeeCalc,
                total_amount: effectiveTotal,
                delivery_address: formData.deliveryAddress,
                delivery_notes: formData.deliveryNotes,
                scheduled_for: formData.scheduledFor || null,
                promo_code: formData.promoCode || null,
                discount_amount: discount,
                delivery_fee_discount: deliveryFeeDiscount,
                payment_reference: response.reference,
                status: 'pending',
                delivery_method: showDeliveryMethodChoice ? deliveryMethod : 'vendor'
            };

            const { data: orderResult, error: orderError } = await supabase
                .rpc('create_order_with_items', orderData);

            if (orderError) {
                throw new Error(orderError.message);
            }

            setSuccess(true);
            showToast(`Order ${orderResult.orderNumber} created successfully!`, 'success');
            setTimeout(() => onSuccess(), 2000);
        } catch (error) {
            showToast('Failed to create order. Please try again or contact support.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDevModePayment = async () => {
        if (!formData.deliveryAddress) {
            setError('Please select your hostel');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Simulate successful payment in dev mode
            await new Promise(resolve => setTimeout(resolve, 1500));

            const orderData = {
                user_id: profile!.id,
                seller_id: items[0].seller_id,
                items: items.map(item => ({
                    menu_item_id: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal: effectiveSubtotal,
                delivery_fee: effectiveDeliveryFeeCalc,
                total_amount: effectiveTotal,
                delivery_address: formData.deliveryAddress,
                delivery_notes: formData.deliveryNotes,
                scheduled_for: formData.scheduledFor || null,
                promo_code: formData.promoCode || null,
                discount_amount: discount,
                delivery_fee_discount: deliveryFeeDiscount,
                payment_reference: 'DEV_MODE_' + Date.now(),
                status: 'pending',
                delivery_method: showDeliveryMethodChoice ? deliveryMethod : 'vendor'
            };

            const { data: orderResult, error: orderError } = await supabase
                .rpc('create_order_with_items', orderData);

            if (orderError) {
                throw new Error(orderError.message);
            }

            setSuccess(true);
            showToast(`Order ${orderResult.orderNumber} created successfully!`, 'success');
            setTimeout(() => onSuccess(), 2000);
        } catch (error) {
            showToast('Failed to create order. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleManualRetry = () => {
        setScriptLoading(true);
        setError('');

        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.onload = () => {
            setScriptLoading(false);
            showToast('Payment gateway loaded successfully', 'success');
        };
        script.onerror = () => {
            setScriptLoading(false);
            setError('Failed to load payment gateway. Please check your internet connection.');
        };
        document.body.appendChild(script);
    };

    if (success) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-2">Order Complete!</h2>
                    <p className="text-gray-600">Your payment was successful and order has been placed.</p>
                    <p className="text-gray-600 mt-2">Order will be delivered to your hostel.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md mx-auto my-4 p-4 sm:p-6">
                    <BackButton
                        onBack={onBack}
                        onClose={onClose}
                        title="Checkout"
                    />

                    <form className="space-y-4">
                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-center">
                                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                                    <p className="text-red-700 text-sm flex-1">{error}</p>
                                    <button
                                        type="button"
                                        onClick={handleManualRetry}
                                        disabled={scriptLoading}
                                        className="ml-2 flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50 flex-shrink-0"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-1 ${scriptLoading ? 'animate-spin' : ''}`} />
                                        Retry
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Hostel Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-black mb-2 flex items-center">
                                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                                Your Hostel *
                            </label>
                            <select
                                value={formData.deliveryAddress}
                                onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                            >
                                <option value="">Select your hostel</option>
                                <option value="New Female Hostel 1">New Female Hostel 1</option>
                                <option value="New Female Hostel 2">New Female Hostel 2</option>
                                <option value="Abuad Hostel">Abuad Hostel</option>
                                <option value="Wema Hostel">Wema Hostel</option>
                                <option value="Male Hostel 1">Male Hostel 1</option>
                                <option value="Male Hostel 2">Male Hostel 2</option>
                                <option value="Male Hostel 3">Male Hostel 3</option>
                                <option value="Male Hostel 4">Male Hostel 4</option>
                                <option value="Male Hostel 5">Male Hostel 5</option>
                                <option value="Male Hostel 6">Male Hostel 6</option>
                                <option value="Medical Male Hostel 1">Medical Male Hostel 1</option>
                                <option value="Medical Male Hostel 2">Medical Male Hostel 2</option>
                                <option value="Female Medical Hostel 1">Female Medical Hostel 1</option>
                                <option value="Female Medical Hostel 2">Female Medical Hostel 2</option>
                                <option value="Female Medical Hostel 3">Female Medical Hostel 3</option>
                                <option value="Female Medical Hostel 4">Female Medical Hostel 4</option>
                                <option value="Female Medical Hostel 5">Female Medical Hostel 5</option>
                                <option value="Female Medical Hostel 6">Female Medical Hostel 6</option>
                            </select>
                        </div>

                        {/* Delivery Method Choice */}
                        {showDeliveryMethodChoice && (
                            <div>
                                <label className="block text-sm font-semibold text-black mb-3">Delivery Method *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setDeliveryMethod('vendor')}
                                        className={`p-4 border-2 rounded-xl transition-all text-left ${deliveryMethod === 'vendor'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Store className="h-5 w-5 mb-2" />
                                        <div className="font-semibold">Vendor Delivery</div>
                                        <div className="text-xs text-gray-500 mt-1">Vendor delivers to you</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeliveryMethod('agent')}
                                        className={`p-4 border-2 rounded-xl transition-all text-left ${deliveryMethod === 'agent'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Truck className="h-5 w-5 mb-2" />
                                        <div className="font-semibold">Agent Delivery</div>
                                        <div className="text-xs text-gray-500 mt-1">Agent picks up for you</div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Delivery Notes */}
                        <div>
                            <label className="block text-sm font-semibold text-black mb-2">Delivery Notes</label>
                            <textarea
                                value={formData.deliveryNotes}
                                onChange={(e) => handleInputChange('deliveryNotes', e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                placeholder="Special instructions for delivery"
                            />
                        </div>

                        {/* Schedule */}
                        <div>
                            <label className="block text-sm font-semibold text-black mb-2">Schedule Delivery</label>
                            <input
                                type="datetime-local"
                                value={formData.scheduledFor}
                                onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                min={new Date().toISOString().slice(0, 16)}
                            />
                        </div>

                        {/* Promo */}
                        <div>
                            <label className="block text-sm font-semibold text-black mb-2">Promo Code</label>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={formData.promoCode}
                                    onChange={(e) => {
                                        handleInputChange('promoCode', e.target.value.toUpperCase());
                                        setPromoError('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                                    placeholder="Enter code"
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyPromo}
                                    className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors whitespace-nowrap"
                                >
                                    Apply
                                </button>
                            </div>
                            {promoError && <p className="text-sm text-red-600 mt-1">{promoError}</p>}
                            {discount > 0 && <p className="text-sm text-green-600 mt-1">Discount applied: -₦{discount.toFixed(2)}</p>}
                            {deliveryFeeDiscount > 0 && <p className="text-sm text-green-600 mt-1">Delivery fee discount applied: -₦{deliveryFeeDiscount.toFixed(2)}</p>}
                        </div>

                        {/* Summary */}
                        <div className="bg-gray-50 rounded-xl p-5 space-y-3 border border-gray-100">
                            <div className="flex justify-between text-gray-700">
                                <span>Subtotal</span>
                                <span className="font-medium">₦{effectiveSubtotal.toFixed(2)}</span>
                            </div>
                            {packCount > 0 && (
                                <div className="flex justify-between text-gray-700">
                                    <span>Food Pack ({packCount}x)</span>
                                    <span className="font-medium">₦{packTotal.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-700">
                                <span>Delivery Fee</span>
                                <span className="font-medium">
                                    {deliveryFeeDiscount > 0 ? (
                                        <span>
                                            <s className="text-red-500">₦{hostelBasedDeliveryFee.toFixed(2)}</s> ₦{effectiveDeliveryFeeCalc.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span>₦{hostelBasedDeliveryFee.toFixed(2)}</span>
                                    )}
                                </span>
                            </div>
                            {deliveryFeeDiscount > 0 && (
                                <div className="flex justify-between text-green-600 font-medium">
                                    <span>Delivery Fee Discount</span>
                                    <span>-₦{deliveryFeeDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            {discount > 0 && (
                                <div className="flex justify-between text-green-600 font-medium">
                                    <span>Discount</span>
                                    <span>-₦{discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold text-black pt-3 border-t border-gray-200">
                                <span>Total</span>
                                <span>₦{effectiveTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Buttons */}
                        <div className="space-y-3">
                            {/* Pay Online Button */}
                            <button
                                type="button"
                                onClick={initializePaystackPayment}
                                disabled={scriptLoading || loading || !formData.deliveryAddress}
                                className="w-full bg-green-600 text-white py-4 rounded-full font-bold text-lg hover:bg-green-700 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {scriptLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Loading payment...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-5 w-5 mr-2" />
                                        Pay Now • ₦{effectiveTotal.toFixed(2)}
                                    </>
                                )}
                            </button>

                            <p className="text-center text-sm text-gray-500">
                                Secure payment powered by Paystack
                            </p>

                            {/* Dev Mode Button */}
                            {import.meta.env.DEV && (
                                <button
                                    type="button"
                                    onClick={handleDevModePayment}
                                    disabled={loading || !formData.deliveryAddress}
                                    className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    🔧 DEV: Simulate Payment
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};