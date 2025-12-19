import React, { useEffect, useState } from 'react';
import { MessageCircle, Package, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services';
import { Order } from '../../lib/supabase';
import { ChatModal } from '../shared/ChatModal';

interface OrderTrackingProps {
  onClose: () => void;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
      const subscription = databaseService.subscribe<Order>(
        'orders',
        () => {
          fetchOrders();
        },
        { user_id: user.id }
      );

      return () => subscription.unsubscribe();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    const { data } = await databaseService.select<Order>({
      table: 'orders',
      match: { user: user.id },
      order: { column: 'created_at', ascending: false },
      limit: 10,
    });

    if (data) {
      setOrders(data);
    }
    setLoading(false);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
      case 'preparing':
        return 'bg-blue-100 text-blue-700';
      case 'ready':
      case 'picked_up':
        return 'bg-orange-100 text-orange-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold #{getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600">Total: #{order.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Payment: {order.payment_method}</p>
                      <p className="text-sm text-gray-600">Address: {order.delivery_address}</p>
                    </div>

                    {order.delivery_agent_id && (
                      <button
                        onClick={() => setSelectedOrderForChat(order)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Chat with Delivery Agent</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedOrderForChat && (
        <ChatModal
          orderId={selectedOrderForChat.id}
          orderNumber={selectedOrderForChat.order_number}
          recipientName="Delivery Agent"
          onClose={() => setSelectedOrderForChat(null)}
        />
      )}
    </>
  );
};
