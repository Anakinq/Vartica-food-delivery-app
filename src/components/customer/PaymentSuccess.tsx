// src/components/customer/PaymentSuccess.tsx
import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const PaymentSuccess: React.FC = () => {
  const { profile } = useAuth();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('order_id');

      if (!orderId) {
        window.location.href = '/';
        return;
      }

      try {
        if (profile) {
          const { data: order } = await supabase
            .from('orders')
            .select('order_number')
            .eq('id', orderId)
            .eq('user_id', profile.id)
            .single();

          if (order) {
            setOrderNumber(order.order_number);
          }
        }

        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('cart');
            window.localStorage.removeItem('selectedSeller');
          }
        } catch (error) {
          console.warn('Storage access blocked by tracking prevention:', error);
        }
      } catch (error) {
        // Error fetching order details
      } finally {
        setLoading(false);
      }
    };

    initializeSuccess();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Processing...</p>
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
          Your order {orderNumber && `#${orderNumber}`} has been confirmed.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700"
        >
          View Orders
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="mt-3 w-full py-3 text-gray-700 rounded-lg font-semibold hover:bg-gray-100"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};