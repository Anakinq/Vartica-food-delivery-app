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
    deliveryOption: '', // Will be set based on vendor capability
  });
  const [discount, setDiscount] = useState(0);
  const [deliveryFeeDiscount, setDeliveryFeeDiscount] = useState(0);
  const [hostelBasedDeliveryFee, setHostelBasedDeliveryFee] = useState(deliveryFee); // Initialize with default delivery fee;

  // Function to calculate delivery fee based on hostel location
  const calculateDeliveryFee = (hostel: string): number => {
    // Define delivery fees based on hostel location
    const hostelDeliveryFees: Record<string, number> = {
      'Med caf': 1000, // Med side to med side
      'New Female Hostel 1': 1500,
      'New Female Hostel 2': 1500,
      'Caf 2': 1500,
      'Caf 1': 1000,
      'Smoothie Shack': 1000,
      'Captain Cook': 1000,
      'Staff Caf': 1000,
      'Seasons': 1500,
      'Abuad Hostel': 700,
      'Wema Hostel': 700,
      'Male Hostel 1': 1500,
      'Male Hostel 2': 1500,
      'Male Hostel 3': 1000,
      'Male Hostel 4': 1000,
      'Male Hostel 5': 1000,
      'Male Hostel 6': 1000,
      'Medical Male Hostel 1': 2000,
      'Medical Male Hostel 2': 2000,
      'Female Medical Hostel 1': 2000,
      'Female Medical Hostel 2': 2000,
      'Female Medical Hostel 3': 2000,
      'Female Medical Hostel 4': 2000,
      'Female Medical Hostel 5': 2000,
      'Female Medical Hostel 6': 2000,
    };

    // Return the specific fee if available, otherwise default to 500
    return hostelDeliveryFees[hostel] || 500;
  };

  // Update delivery fee when hostel selection changes
  useEffect(() => {
    if (formData.deliveryAddress) {
      const fee = calculateDeliveryFee(formData.deliveryAddress);
      setHostelBasedDeliveryFee(fee);
    } else {
      setHostelBasedDeliveryFee(deliveryFee); // Reset to default if no hostel selected
    }
  }, [formData.deliveryAddress]);
  const [promoError, setPromoError] = useState('');
  const [error, setError] = useState('');
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
    // Add SRI hash for CSP compliance
    // Note: This is a placeholder hash - you should generate the actual hash for the specific version of the script
    script.setAttribute('integrity', 'sha384-abcdefghijklmnopqrstuvwxyz1234567890');
    script.setAttribute('crossorigin', 'anonymous');
    script.onload = () => setPaystackScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Paystack script');
      setError('Payment system failed to load. Please try again later.');
    };
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, []);

  const MIN_NGN = 100;
  const packPrice = 300.00;
  const packTotal = packPrice * packCount;
  const platformCommission = 200.0; // Fixed ₦200 platform commission
  const effectiveDeliveryFee = Math.max(hostelBasedDeliveryFee - deliveryFeeDiscount, 0);
  const total = subtotal + packTotal + effectiveDeliveryFee - discount;
  const effectiveTotal = Math.max(total + platformCommission, MIN_NGN);
  const totalInKobo = Math.round(effectiveTotal * 100);

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!formData.promoCode.trim()) return;

    // First try regular promo codes
    let { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', formData.promoCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      // Regular promo code found
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
      setDeliveryFeeDiscount(0); // Reset delivery fee discount when using regular promo
      return;
    }

    // If not found in regular promo codes, check delivery fee discount codes
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
    if (subtotal < deliveryFeeData.min_order_value) {
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

    // Ensure discount doesn't exceed delivery fee
    calculatedDeliveryFeeDiscount = Math.min(calculatedDeliveryFeeDiscount, hostelBasedDeliveryFee);

    setDeliveryFeeDiscount(calculatedDeliveryFeeDiscount);
    setDiscount(0); // Reset regular discount when using delivery fee discount
  };

  const createOrder = async (paymentReference?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (items.length === 0) throw new Error('Cart is empty');

    const sellerId = items[0].seller_id;
    const sellerType = items[0].seller_type;
    if (!sellerId || !sellerType) throw new Error('Invalid seller info');

    // Calculate effective delivery fee after discount
    const platformCommission = 200.0; // Fixed ₦200 platform commission
    const effectiveDeliveryFee = Math.max(hostelBasedDeliveryFee - deliveryFeeDiscount, 0);
    const total = subtotal + packTotal + effectiveDeliveryFee - discount;
    const effectiveTotal = Math.max(total + platformCommission, MIN_NGN);

    // Generate unique order number
    const orderNumber = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Check if the vendor offers hostel delivery
    const { data: vendorData, error: vendorError } = await supabase
      .from('vendors')
      .select('delivery_option')
      .eq('id', sellerId)
      .single();

    let deliveryAgentId = null;

    // If vendor does NOT offer hostel delivery, try to assign a delivery agent
    if (vendorData?.delivery_option === 'does_not_offer_hostel_delivery') {
      const { data: availableAgent, error: agentError } = await supabase
        .from('delivery_agents')
        .select('id, active_orders_count')
        .eq('is_active', true)
        .eq('is_available', true)
        .order('active_orders_count', { ascending: true })
        .limit(1)
        .single();

      if (agentError) {
        console.error('Error finding delivery agent:', agentError);
        // For now, we'll continue without an agent and assign one later
      } else {
        deliveryAgentId = availableAgent?.id || null;
      }
    }
    // If vendor DOES offer hostel delivery, no delivery agent is needed
    // Create the order first
    const orderPayload = {
      order_number: orderNumber,
      user_id: user.id,
      seller_id: sellerId,
      seller_type: sellerType,
      delivery_agent_id: deliveryAgentId, // Assign agent if needed based on vendor delivery option
      status: 'pending',
      subtotal,
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
    };

    const { data: orderData, error: insertError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select('id')
      .single();

    if (insertError) throw insertError;

    // Now create the order items
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
      // If order items fail to insert, we should delete the order to maintain consistency
      await supabase.from('orders').delete().eq('id', orderData.id);
      throw itemsInsertError;
    }

    return { success: true };
  };

  const sendToWebhook = async (reference: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Format data to match Paystack webhook format for charge.success event
    const paystackWebhookData = {
      event: 'charge.success',
      data: {
        reference,
        amount: Math.round(effectiveTotal * 100), // Paystack sends amount in kobo
        status: 'success',
        gateway_response: 'Successful',
        paid_at: new Date().toISOString(),
        channel: 'card',
        currency: 'NGN',
        customer: {
          email: profile?.email || 'unknown@example.com',
        },
        authorization: {
          authorization_code: 'AUTH_' + reference,
          bin: '412345',
          last4: '1234',
          exp_month: '12',
          exp_year: '2025',
          channel: 'card',
        }
      }
    };

    const webhookRes = await fetch('/api/paystack-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paystackWebhookData),
    });

    if (!webhookRes.ok) throw new Error('Webhook verification failed');
  };

  const handlePaystackSuccess = async (response: any) => {
    try {
      setLoading(true);
      // Create order with payment reference after successful payment
      await createOrder(response.reference);

      // If a delivery fee discount promo code was used, increment its usage count
      if (formData.promoCode && deliveryFeeDiscount > 0) {
        const { error: incrementError } = await supabase.rpc('increment_promo_code_usage', {
          p_code: formData.promoCode.toUpperCase()
        });

        if (incrementError) {
          console.error('Error incrementing promo code usage:', incrementError);
        }
      }

      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      console.error('Payment success but order creation failed:', error);
      alert('Payment successful but order creation failed. Contact support with payment reference: ' + response.reference);
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

      // If a delivery fee discount promo code was used, increment its usage count
      if (formData.promoCode && deliveryFeeDiscount > 0) {
        const { error: incrementError } = await supabase.rpc('increment_promo_code_usage', {
          p_code: formData.promoCode.toUpperCase()
        });

        if (incrementError) {
          console.error('Error incrementing promo code usage:', incrementError);
        }
      }

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
                <option value="Caf 2">Caf 2</option>
                <option value="Caf 1">Caf 1</option>
                <option value="Smoothie Shack">Smoothie Shack</option>
                <option value="Captain Cook">Captain Cook</option>
                <option value="Staff Caf">Staff Caf</option>
                <option value="Med caf">Med caf</option>
                <option value="Seasons">Seasons</option>
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
              <div className="flex justify-between text-gray-700"><span>Subtotal</span><span className="font-medium">₦{subtotal.toFixed(2)}</span></div>
              {packCount > 0 && <div className="flex justify-between text-gray-700"><span>Food Pack ({packCount}x)</span><span className="font-medium">₦{packTotal.toFixed(2)}</span></div>}
              <div className="flex justify-between text-gray-700">
                <span>Delivery Fee</span>
                <span className="font-medium">
                  {deliveryFeeDiscount > 0 ? (
                    <span>
                      <s className="text-red-500">₦{hostelBasedDeliveryFee.toFixed(2)}</s> ₦{effectiveDeliveryFee.toFixed(2)}
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
