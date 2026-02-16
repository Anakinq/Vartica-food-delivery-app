// src/components/customer/Checkout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, AlertCircle, X, RefreshCw } from 'lucide-react';
import { PaystackButton } from 'react-paystack';
import { supabase, MenuItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  HOSTEL_DELIVERY_FEES,
  BUSINESS_CONSTANTS,
  MIN_NGN_VALUE
} from '../../utils/constants';

interface CartItem extends MenuItem {
  quantity: number;
}

interface CheckoutProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  packCount?: number;
  onBack: () => void;
  onClose: () => void;
  onSuccess: () => void;
}

// Delivery method options for BOTH vendors
export type DeliveryMethod = 'vendor' | 'agent';

export const Checkout: React.FC<CheckoutProps> = ({
  items,
  subtotal,
  deliveryFee,
  packCount = 0,
  onBack,
  onClose,
  onSuccess,
}) => {
  // Graceful error handling instead of throwing errors
  const effectiveSubtotal = typeof subtotal === 'number' && !isNaN(subtotal) ? subtotal : 0;
  const effectiveDeliveryFee = typeof deliveryFee === 'number' && !isNaN(deliveryFee) ? deliveryFee : 0;

  const { profile } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    deliveryAddress: '',
    deliveryNotes: '',
    promoCode: '',
    scheduledFor: '',
    deliveryOption: '',
  });
  const [discount, setDiscount] = useState(0);
  const [deliveryFeeDiscount, setDeliveryFeeDiscount] = useState(0);
  const [hostelBasedDeliveryFee, setHostelBasedDeliveryFee] = useState(effectiveDeliveryFee);
  const [promoError, setPromoError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paystackScriptLoaded, setPaystackScriptLoaded] = useState(true); // Always true with npm package
  const [scriptLoading, setScriptLoading] = useState(false);
  // Payment method is always online (Paystack)
  const paymentMethod: 'online' = 'online';
  const [isDevMode, setIsDevMode] = useState(false);

  // Marketplace delivery method state (for BOTH vendors)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('agent');
  const [vendorDeliveryMode, setVendorDeliveryMode] = useState<string | null>(null);
  const [vendorType, setVendorType] = useState<string | null>(null);
  const [showDeliveryMethodChoice, setShowDeliveryMethodChoice] = useState(false);

  // Check if current order is from a student vendor (no hostel delivery fee)
  const isStudentVendor = vendorType === 'student';

  // Function to calculate delivery fee based on hostel location
  const calculateDeliveryFee = useCallback((hostel: string): number => {
    return HOSTEL_DELIVERY_FEES[hostel] || BUSINESS_CONSTANTS.DELIVERY_FEE_DEFAULT;
  }, []);

  // Update delivery fee when hostel selection changes
  useEffect(() => {
    if (formData.deliveryAddress) {
      // Student vendors have no hostel delivery fee
      if (isStudentVendor) {
        setHostelBasedDeliveryFee(0);
      } else {
        const fee = calculateDeliveryFee(formData.deliveryAddress);
        setHostelBasedDeliveryFee(fee);
      }
    } else {
      setHostelBasedDeliveryFee(effectiveDeliveryFee);
    }
  }, [formData.deliveryAddress, isStudentVendor]);

  // Fetch vendor's delivery_mode and vendor_type for marketplace flow
  useEffect(() => {
    const fetchVendorDeliveryMode = async () => {
      if (items.length > 0) {
        const sellerId = items[0].seller_id;
        const sellerType = items[0].seller_type;

        if (sellerType === 'vendor') {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('delivery_mode, vendor_type')
            .eq('id', sellerId)
            .single();

          if (vendorData) {
            setVendorDeliveryMode(vendorData.delivery_mode || null);
            setVendorType(vendorData.vendor_type || null);
            setShowDeliveryMethodChoice(vendorData.delivery_mode === 'both');
          }
        } else if (sellerType === 'late_night_vendor') {
          // Late night vendors have delivery fees like cafeterias
          setVendorType('late_night_vendor');
        } else if (sellerType === 'cafeteria') {
          setVendorType('cafeteria');
        }
      }
    };

    fetchVendorDeliveryMode();
  }, [items]);

  // Remove the old script loading functions since we're using the npm package
  const handleManualRetry = () => {
    setError('');
    // With npm package, retry is handled automatically
    showToast({ type: 'info', message: 'Payment system is ready to use' });
  };

  const MIN_NGN = 100;
  const packPrice = 300.00;
  const packTotal = packPrice * packCount;
  const platformCommission = 200.0;
  const effectiveDeliveryFeeCalc = Math.max(hostelBasedDeliveryFee - deliveryFeeDiscount, 0);
  const total = effectiveSubtotal + packTotal + effectiveDeliveryFeeCalc - discount;
  const effectiveTotal = Math.max(total + platformCommission, MIN_NGN);
  const totalInKobo = Math.round(effectiveTotal * 100);

  // Paystack configuration
  const paystackConfig = {
    email: profile?.email || '',
    amount: totalInKobo,
    metadata: {
      custom_fields: [
        {
          display_name: "Order Items",
          variable_name: "order_items",
          value: items.map(item => `${item.name} x${item.quantity}`).join(', ')
        },
        {
          display_name: "Delivery Address",
          variable_name: "delivery_address",
          value: formData.deliveryAddress
        }
      ]
    },
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    text: 'Pay Now',
    onSuccess: (reference: any) => {
      handlePaystackSuccess(reference);
    },
    onClose: () => {
      setError('Payment cancelled');
    },
  };

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!formData.promoCode.trim()) return;

    let { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', formData.promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      if (new Date(data.valid_until) < new Date()) {
        setPromoError('Promo code has expired');
        return;
      }
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        setPromoError('Promo code usage limit reached');
        return;
      }
      if (effectiveSubtotal < data.min_order_value) {
        setPromoError(`Minimum order value is ₦${data.min_order_value}`);
        return;
      }
      let calculatedDiscount = 0;
      if (data.discount_type === 'percentage') {
        calculatedDiscount = (effectiveSubtotal * data.discount_value) / 100;
        if (data.max_discount) {
          calculatedDiscount = Math.min(calculatedDiscount, data.max_discount);
        }
      } else {
        calculatedDiscount = data.discount_value;
      }
      setDiscount(calculatedDiscount);
      setDeliveryFeeDiscount(0);
      showToast({ type: 'success', message: `Discount of ₦${calculatedDiscount.toFixed(2)} applied!` });
      return;
    }

    const { data: deliveryFeeData, error: deliveryFeeError } = await supabase
      .from('delivery_fee_discount_promo_codes')
      .select('*')
      .eq('code', formData.promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (deliveryFeeError || !deliveryFeeData) {
      setPromoError('Invalid promo code');
      return;
    }

    if (new Date(deliveryFeeData.valid_until) < new Date()) {
      setPromoError('Promo code has expired');
      return;
    }
    if (deliveryFeeData.usage_limit && deliveryFeeData.used_count >= deliveryFeeData.usage_limit) {
      setPromoError('Promo code usage limit reached');
      return;
    }
    if (effectiveSubtotal < deliveryFeeData.min_order_value) {
      setPromoError(`Minimum order value is ₦${deliveryFeeData.min_order_value}`);
      return;
    }

    let calculatedDeliveryFeeDiscount = 0;
    if (deliveryFeeData.discount_type === 'percentage') {
      calculatedDeliveryFeeDiscount = (hostelBasedDeliveryFee * deliveryFeeData.discount_value) / 100;
      if (deliveryFeeData.max_discount) {
        calculatedDeliveryFeeDiscount = Math.min(calculatedDeliveryFeeDiscount, deliveryFeeData.max_discount);
      }
    } else {
      calculatedDeliveryFeeDiscount = deliveryFeeData.discount_value;
    }

    calculatedDeliveryFeeDiscount = Math.min(calculatedDeliveryFeeDiscount, hostelBasedDeliveryFee);

    setDeliveryFeeDiscount(calculatedDeliveryFeeDiscount);
    setDiscount(0);
    showToast({ type: 'success', message: `Delivery fee discount of ₦${calculatedDeliveryFeeDiscount.toFixed(2)} applied!` });
  };

  const createOrder = async (paymentReference?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (items.length === 0) throw new Error('Cart is empty');

    const sellerId = items[0].seller_id;
    const sellerType = items[0].seller_type;
    if (!sellerId || !sellerType) throw new Error('Invalid seller info');

    const effectiveDeliveryFee = Math.max(hostelBasedDeliveryFee - deliveryFeeDiscount, 0);
    const total = effectiveSubtotal + packTotal + effectiveDeliveryFee - discount;
    const effectiveTotal = Math.max(total + platformCommission, MIN_NGN);

    const orderNumber = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Marketplace flow: Determine delivery_handler based on vendor's delivery_mode
    let deliveryHandler: 'vendor' | 'agent' = 'agent';
    let deliveryAgentId: string | null = null;

    if (sellerType === 'vendor' && vendorDeliveryMode) {
      if (vendorDeliveryMode === 'self_delivery') {
        // Vendor delivers themselves
        deliveryHandler = 'vendor';
        deliveryAgentId = null;
      } else if (vendorDeliveryMode === 'pickup_only') {
        // Agent picks up from vendor
        deliveryHandler = 'agent';
        // Don't assign agent yet - vendor marks as READY_FOR_PICKUP first
        deliveryAgentId = null;
      } else if (vendorDeliveryMode === 'both') {
        // Customer chose at checkout
        deliveryHandler = deliveryMethod;
        // Don't assign agent yet - vendor marks as READY_FOR_PICKUP first
        deliveryAgentId = null;
      }
    }
    // Cafeteria orders always use agent delivery

    const orderPayload = {
      order_number: orderNumber,
      user_id: user.id,
      seller_id: sellerId,
      seller_type: sellerType,
      delivery_agent_id: deliveryAgentId,
      status: 'pending',
      subtotal: effectiveSubtotal,
      delivery_fee: hostelBasedDeliveryFee,
      delivery_fee_discount: deliveryFeeDiscount,
      discount,
      total: effectiveTotal,
      payment_method: 'online',
      payment_status: 'paid',
      payment_reference: paymentReference || null,
      promo_code: formData.promoCode || null,
      delivery_address: formData.deliveryAddress.trim() || 'Hostel not selected',
      delivery_notes: formData.deliveryNotes || null,
      scheduled_for: formData.scheduledFor || null,
      platform_commission: 200.0,
      agent_earnings: 0.0,
      // Marketplace delivery handler
      delivery_handler: deliveryHandler,
    };

    const { data: orderData, error: insertError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id')
      .single();

    if (insertError) throw insertError;

    const orderItems = items.map(item => ({
      order_id: orderData.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsInsertError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsInsertError) {
      await supabase.from('orders').delete().eq('id', orderData.id);
      throw itemsInsertError;
    }

    return { success: true, orderNumber };
  };

  const handlePaystackSuccess = async (response: any) => {
    try {
      setLoading(true);
      const orderResult = await createOrder(response.reference);

      if (formData.promoCode && deliveryFeeDiscount > 0) {
        const { error: incrementError } = await supabase.rpc('increment_promo_code_usage', {
          p_code: formData.promoCode.toUpperCase()
        });

        if (incrementError) {
          console.error('Error incrementing promo code usage:', incrementError);
        }
      }

      setSuccess(true);
      showToast({ type: 'success', message: `Order ${orderResult.orderNumber} created successfully!` });
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Payment successful but order creation failed. Contact support with reference: ' + response.reference
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackClose = () => {
    showToast({ type: 'info', message: 'Payment cancelled - your items are still in cart' });
  };

  // Dev mode - Simulate payment success and credit wallets
  const handleDevModePayment = async () => {
    if (!import.meta.env.DEV) {
      showToast({ type: 'error', message: 'Dev mode only' });
      return;
    }
    try {
      setLoading(true);
      const orderResult = await createOrder('DEV_SIMULATED_PAYMENT');

      if (formData.promoCode && deliveryFeeDiscount > 0) {
        const { error: incrementError } = await supabase.rpc('increment_promo_code_usage', {
          p_code: formData.promoCode.toUpperCase()
        });
        if (incrementError) {
          console.error('Error incrementing promo code usage:', incrementError);
        }
      }

      setSuccess(true);
      showToast({ type: 'success', message: `DEV: Order ${orderResult.orderNumber} created! (Payment simulated, wallets credited)` });
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to create order: ' + (error as Error).message
      });
    } finally {
      setLoading(false);
    }
  };

  const initializePaystackPayment = () => {
    if (!profile?.email) {
      showToast({ type: 'error', message: 'Email is required for payment. Please update your profile.' });
      return;
    }
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      showToast({ type: 'error', message: 'Payment system not configured. Please contact support.' });
      return;
    }
    const email = profile.email;
    const ref = `VARTICA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const handler = (window as any).PaystackPop.setup({
      key: paystackKey,
      email,
      amount: totalInKobo,
      currency: 'NGN',
      ref,
      callback: (response: any) => handlePaystackSuccess(response),
      onClose: () => handlePaystackClose(),
      metadata: {
        custom_fields: [
          {
            display_name: 'Customer',
            variable_name: 'customer_name',
            value: profile.full_name || 'N/A'
          },
          {
            display_name: 'Platform',
            variable_name: 'platform',
            value: 'Vartica Food Delivery'
          }
        ]
      }
    });

    handler.openIframe();
  };

  const handleSubmit = async (reference: string) => {
    setLoading(true);
    try {
      const orderResult = await createOrder(reference);

      if (formData.promoCode && deliveryFeeDiscount > 0) {
        const { error: incrementError } = await supabase.rpc('increment_promo_code_usage', {
          p_code: formData.promoCode.toUpperCase()
        });

        if (incrementError) {
          console.error('Error incrementing promo code usage:', incrementError);
        }
      }

      setSuccess(true);
      showToast({ type: 'success', message: `Order ${orderResult.orderNumber} created successfully!` });
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to create order. Please try again or contact support.'
      });
    } finally {
      setLoading(false);
    }
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
          <p className="text-gray-600 mt-2">Order # will be delivered to your hostel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto overflow-x-hidden">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 overflow-x-hidden">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-black ml-2 sm:ml-4">Checkout</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form className="space-y-4 sm:space-y-6">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700 text-sm flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={handleManualRetry}
                    disabled={scriptLoading}
                    className="ml-2 flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${scriptLoading ? 'animate-spin' : ''}`} />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Hostel Selection */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Your Hostel *</label>
              <select
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
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

            {/* Delivery Method Choice - For BOTH vendors */}
            {showDeliveryMethodChoice && (
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Delivery Method *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('vendor')}
                    className={`p-4 border-2 rounded-xl transition-all ${deliveryMethod === 'vendor'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="text-lg font-semibold">Vendor Delivery</div>
                    <div className="text-sm text-gray-500 mt-1">Vendor delivers to you</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('agent')}
                    className={`p-4 border-2 rounded-xl transition-all ${deliveryMethod === 'agent'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="text-lg font-semibold">Agent Delivery</div>
                    <div className="text-sm text-gray-500 mt-1">Agent picks up for you</div>
                  </button>
                </div>
              </div>
            )}

            {/* Delivery Notes */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Delivery Notes (Optional)</label>
              <textarea
                value={formData.deliveryNotes}
                onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                placeholder="Special instructions for delivery"
              />
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Schedule Delivery (Optional)</label>
              <input
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
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
                    setFormData({ ...formData, promoCode: e.target.value.toUpperCase() });
                    setPromoError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                  placeholder="Enter code"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
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
              <div className="flex justify-between text-gray-700"><span>Subtotal</span><span className="font-medium">₦{effectiveSubtotal.toFixed(2)}</span></div>
              {packCount > 0 && <div className="flex justify-between text-gray-700"><span>Food Pack ({packCount}x)</span><span className="font-medium">₦{packTotal.toFixed(2)}</span></div>}
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
              {discount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Discount</span><span>-₦{discount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-xl font-bold text-black pt-3 border-t border-gray-200"><span>Total</span><span>₦{effectiveTotal.toFixed(2)}</span></div>
            </div>

            {/* Pay Button */}
            <div className="space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Pay Online Button */}
              <button
                type="button"
                onClick={initializePaystackPayment}
                disabled={scriptLoading}
                className="w-full bg-green-600 text-white py-4 rounded-full font-bold text-lg hover:bg-green-700 transition-colors shadow-lg disabled:opacity-70 flex items-center justify-center"
              >
                {scriptLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Loading payment gateway...
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
