// src/components/customer/Checkout.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase, MenuItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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

export const Checkout: React.FC<CheckoutProps> = ({
  items,
  subtotal,
  deliveryFee,
  packCount = 0,
  onBack,
  onClose,
  onSuccess,
}) => {
  if (typeof subtotal !== 'number' || isNaN(subtotal)) {
    console.error('Invalid subtotal:', subtotal);
    throw new Error('Invalid subtotal value');
  }
  if (typeof deliveryFee !== 'number' || isNaN(deliveryFee)) {
    console.error('Invalid deliveryFee:', deliveryFee);
    throw new Error('Invalid delivery fee value');
  }
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    deliveryAddress: '',
    deliveryNotes: '',
    promoCode: '',
    scheduledFor: '',
  });
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paystackScriptLoaded, setPaystackScriptLoaded] = useState(false);

  // 💳 Load Paystack script + CSS safely
  useEffect(() => {
    // Load JS only (avoid CSS which causes CSP violations)
    const scriptId = 'paystack-inline-js';
    if (document.getElementById(scriptId)) {
      setPaystackScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setPaystackScriptLoaded(true);
    script.onerror = () => alert('Failed to load payment system');
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, []);

  const MIN_NGN = 100;
  const packPrice = 300.00;
  const packTotal = packPrice * packCount;
  const total = subtotal + packTotal + deliveryFee - discount;
  const effectiveTotal = Math.max(total, MIN_NGN);
  const totalInKobo = Math.round(effectiveTotal * 100);

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!formData.promoCode.trim()) return;
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', formData.promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) {
      setPromoError('Invalid promo code');
      return;
    }
    if (new Date(data.valid_until) < new Date()) {
      setPromoError('Promo code has expired');
      return;
    }
    if (data.usage_limit && data.used_count >= data.usage_limit) {
      setPromoError('Promo code usage limit reached');
      return;
    }
    if (subtotal < data.min_order_value) {
      setPromoError(`Minimum order value is ₦${data.min_order_value}`);
      return;
    }
    let calculatedDiscount = 0;
    if (data.discount_type === 'percentage') {
      calculatedDiscount = (subtotal * data.discount_value) / 100;
      if (data.max_discount) {
        calculatedDiscount = Math.min(calculatedDiscount, data.max_discount);
      }
    } else {
      calculatedDiscount = data.discount_value;
    }
    setDiscount(calculatedDiscount);
  };

  const createOrder = async (paymentReference?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (items.length === 0) throw new Error('Cart is empty');

    const sellerId = items[0].seller_id;
    const sellerType = items[0].seller_type;
    if (!sellerId || !sellerType) throw new Error('Invalid seller info');

    const orderPayload = {
      user_id: user.id,
      seller_id: sellerId,
      seller_type: sellerType,
      status: 'pending',
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total: effectiveTotal,
      payment_method: 'online',
      payment_status: 'paid',
      payment_reference: paymentReference || null,
      promo_code: formData.promoCode || null,
      delivery_address: formData.deliveryAddress.trim() || 'Address not provided',
      delivery_notes: formData.deliveryNotes || null,
      scheduled_for: formData.scheduledFor || null,
      platform_commission: 300.0,
      agent_earnings: 200.0,
    };
    const { error: insertError } = await supabase.from('orders').insert(orderPayload);
    if (insertError) throw insertError;
    return { success: true };
  };

  const sendToWebhook = async (reference: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const orderData = {
      user_id: user.id,
      seller_id: items[0].seller_id,
      seller_type: items[0].seller_type,
      subtotal,
      delivery_fee: deliveryFee,
      discount,
      total: effectiveTotal,
      promo_code: formData.promoCode || null,
      delivery_address: formData.deliveryAddress.trim() || 'Address not provided',
      delivery_notes: formData.deliveryNotes || null,
      scheduled_for: formData.scheduledFor || null,
    };

    const webhookRes = await fetch('/api/paystack-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, order: orderData }),
    });

    if (!webhookRes.ok) throw new Error('Webhook verification failed');
  };

  const handlePaystackSuccess = async (response: any) => {
    try {
      setLoading(true);
      await sendToWebhook(response.reference);
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      alert('Payment successful but order creation failed. Contact support with payment reference.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackClose = () => {
    alert('Payment cancelled');
  };

  const handleSubmit = async (reference: string) => {
    setLoading(true);
    try {
      await createOrder(reference);
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      alert(`Failed to create order: ${(error as Error).message}`);
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
          <h2 className="text-2xl font-bold text-black mb-2">Payment Successful!</h2>
          <p className="text-gray-600">
            Your payment was successful. Order is being processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
          <div className="flex items-center mb-6">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold text-black ml-4">Checkout</h2>
          </div>
          <form className="space-y-6">
            {/* Delivery Address */}
            <div>
              <label className="block text-sm font-semibold text-black mb-2">Delivery Address *</label>
              <textarea
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                placeholder="Building name, room number, etc."
              />
            </div>

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
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 border border-gray-100">
              <div className="flex justify-between text-gray-700"><span>Subtotal</span><span className="font-medium">₦{subtotal.toFixed(2)}</span></div>
              {packCount > 0 && <div className="flex justify-between text-gray-700"><span>Food Pack ({packCount}x)</span><span className="font-medium">₦{packTotal.toFixed(2)}</span></div>}
              <div className="flex justify-between text-gray-700"><span>Delivery Fee</span><span className="font-medium">₦{deliveryFee.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600 font-medium"><span>Discount</span><span>-₦{discount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-xl font-bold text-black pt-3 border-t border-gray-200"><span>Total</span><span>₦{effectiveTotal.toFixed(2)}</span></div>
            </div>

            {/* Pay Button */}
            {!paystackScriptLoaded ? (
              <button type="button" disabled className="w-full bg-green-600 text-white py-4 rounded-full font-bold text-lg opacity-75">
                Loading payment gateway...
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!(window as any).PaystackPop) {
                    alert('Payment gateway not loaded. Refresh and try again.');
                    return;
                  }
                  if (!profile?.email) {
                    alert('Email is required for payment. Please update your profile.');
                    return;
                  }
                  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim();
                  if (!paystackKey) {
                    alert('Payment system not configured. Please contact support.');
                    console.error('VITE_PAYSTACK_PUBLIC_KEY not set');
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
                  });
                  handler.openIframe();
                }}
                className="w-full bg-green-600 text-white py-4 rounded-full font-bold text-lg hover:bg-green-700 transition-colors shadow-lg"
              >
                Pay Now • ₦{effectiveTotal.toFixed(2)}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
