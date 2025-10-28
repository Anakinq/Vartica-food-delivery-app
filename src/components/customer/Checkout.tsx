import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { supabase, MenuItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PaystackButton } from 'react-paystack'; // 👈 NEW

interface CartItem extends MenuItem {
  quantity: number;
}

interface CheckoutProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  onBack: () => void;
  onClose: () => void;
  onSuccess: () => void;
}

export const Checkout: React.FC<CheckoutProps> = ({
  items,
  subtotal,
  deliveryFee,
  onBack,
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth(); // 👈 Added profile for email
  const [formData, setFormData] = useState({
    deliveryAddress: '',
    deliveryNotes: '',
    paymentMethod: 'cash' as 'cash' | 'online',
    promoCode: '',
    scheduledFor: '',
  });
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = subtotal + deliveryFee - discount;
  const totalInKobo = Math.round(total * 100); // Paystack uses kobo (smallest currency unit)

  // Paystack config
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
  const paystackConfig = {
    reference: `ORD-${Date.now()}`,
    email: profile?.email || user?.email || 'customer@example.com',
    amount: totalInKobo,
    publicKey,
  };

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
      setPromoError(`Minimum order value is #${data.min_order_value}`);
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

  // Create order AFTER successful payment
  const createOrder = async (paymentReference?: string) => {
    if (!user || items.length === 0) {
      throw new Error('No user or items');
    }

    try {
      // ✅ Ensure orderNumber is a valid non-empty string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 11).toUpperCase();
      const orderNumber = `ORD-${timestamp}-${randomStr}`;

      if (!orderNumber || orderNumber.length < 10) {
        throw new Error('Failed to generate order number');
      }

      const sellerId = items[0].seller_id;
      const sellerType = items[0].seller_type;

      if (!sellerId || !sellerType) {
        throw new Error('Missing seller info');
      }

      const { order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,   // ✅ now guaranteed valid
          user_id: user.id,
          seller_id: sellerId,
          seller_type: sellerType,
          status: 'pending',
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          total,
          payment_method: formData.paymentMethod,
          payment_status: formData.paymentMethod === 'cash' ? 'pending' : 'paid',
          payment_reference: paymentReference || null,
          promo_code: formData.promoCode || null,
          delivery_address: formData.deliveryAddress.trim() || 'Address not provided',
          delivery_notes: formData.deliveryNotes || null,
          scheduled_for: formData.scheduledFor || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // ... rest of your code (order_items, promo update)

      return order;
    } catch (error) {
      console.error('Order creation error:', error);
      throw error;
    }
  };

  // Handle Paystack success
  const handlePaystackSuccess = async (reference: any) => {
    try {
      setLoading(true);
      await createOrder(reference.reference);
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      alert('Payment succeeded but order failed. Contact support.');
      console.error('Post-payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackClose = () => {
    alert('Payment cancelled');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.paymentMethod === 'online') {
      // Paystack will handle submission via its button
      return;
    }

    // Cash payment: create order immediately
    setLoading(true);
    try {
      await createOrder();
      setSuccess(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {formData.paymentMethod === 'online' ? 'Payment Successful!' : 'Order Placed!'}
          </h2>
          <p className="text-gray-600">
            {formData.paymentMethod === 'online'
              ? 'Your payment was successful. Order is being processed.'
              : 'Your order has been successfully placed. A delivery agent will accept it shortly.'}
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
            <h2 className="text-2xl font-bold text-gray-900 ml-4">Checkout</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address *
              </label>
              <textarea
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Building name, room number, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Notes (Optional)
              </label>
              <textarea
                value={formData.deliveryNotes}
                onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Special instructions for delivery"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Delivery (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promo Code
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={formData.promoCode}
                  onChange={(e) => {
                    setFormData({ ...formData, promoCode: e.target.value.toUpperCase() });
                    setPromoError('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter code"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Apply
                </button>
              </div>
              {promoError && (
                <p className="text-sm text-red-600 mt-1">{promoError}</p>
              )}
              {discount > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  Discount applied: -#{discount.toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="cash"
                    checked={formData.paymentMethod === 'cash'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'cash' })}
                    className="mr-3"
                  />
                  <span className="font-medium">Cash on Delivery</span>
                </label>
                <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="online"
                    checked={formData.paymentMethod === 'online'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'online' })}
                    className="mr-3"
                  />
                  <span className="font-medium">Online Payment</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>#{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>#{deliveryFee.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-#{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Total</span>
                <span>#{total.toFixed(2)}</span>
              </div>
            </div>

            {formData.paymentMethod === 'online' ? (
              // Paystack Button
              <PaystackButton
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                {...paystackConfig}
                onSuccess={handlePaystackSuccess}
                onClose={handlePaystackClose}
              >
                Pay Now (#{total.toFixed(2)})
              </PaystackButton>
            ) : (
              // Cash Payment Button
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};