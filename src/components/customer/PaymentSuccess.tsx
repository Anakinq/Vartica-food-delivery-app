// src/pages/customer/PaymentSuccess.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSuccess = async () => {
      // Get order_id from URL query params
      const urlParams = new URLSearchParams(location.search);
      const orderId = urlParams.get('order_id');

      if (!orderId) {
        navigate('/customer');
        return;
      }

      try {
        // Optional: Verify the order exists and belongs to the user
        if (profile) {
          const { data: order } = await supabase
            .from('orders')
            .select('order_number, payment_status')
            .eq('id', orderId)
            .eq('customer_id', profile.id)
            .single();

          if (order) {
            setOrderNumber(order.order_number);
            // Optionally update payment_status to 'paid' here
            // (Better done via webhook, but this works for now)
          }
        }

        // Clear cart (if stored in localStorage or context)
        localStorage.removeItem('cart');
        localStorage.removeItem('selectedSeller');

      } catch (error) {
        console.error('Error in payment success:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSuccess();
  }, [location, navigate, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Processing your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your order {orderNumber && `#${orderNumber}`} has been confirmed and is being prepared.
        </p>
        <button
          onClick={() => navigate('/customer/orders')}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
        >
          View My Orders
        </button>
        <button
          onClick={() => navigate('/customer')}
          className="mt-3 w-full py-3 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};
