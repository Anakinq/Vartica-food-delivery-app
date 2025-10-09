import React, { useEffect, useState } from 'react';
import { LogOut, Package, Clock, CheckCircle, MapPin, MessageCircle, Wifi, WifiOff, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, DeliveryAgent } from '../../lib/supabase';
import { ChatModal } from '../shared/ChatModal';

export const DeliveryDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [customerFunds, setCustomerFunds] = useState(0);      // Full order amounts (to buy food)
  const [deliveryEarnings, setDeliveryEarnings] = useState(0); // #200 per delivered order
  const [dashboardKey, setDashboardKey] = useState(0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    const { data: agentData } = await supabase
      .from('delivery_agents')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (agentData) {
      setAgent(agentData);
      setIsOnline(agentData.is_available);

      // Fetch my orders (active + delivered today)
      const { data: myOrdersData } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_agent_id', agentData.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      setMyOrders(myOrdersData ? [...myOrdersData] : []);

      // Available orders
      if (agentData.is_available) {
        const { data: available } = await supabase
          .from('orders')
          .select('*')
          .is('delivery_agent_id', null)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setAvailableOrders(available ? [...available] : []);
      } else {
        setAvailableOrders([]);
      }

      // Calculate balances
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Customer funds = sum of total for paid orders (not delivered yet)
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('delivery_agent_id', agentData.id)
        .eq('payment_status', 'paid')
        .gte('created_at', today.toISOString());
      const funds = paidOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
      setCustomerFunds(funds);

      // Delivery earnings = #200 per delivered order today
      const { data: deliveredOrders } = await supabase
        .from('orders')
        .select('agent_earnings')
        .eq('delivery_agent_id', agentData.id)
        .eq('status', 'delivered')
        .gte('created_at', today.toISOString());
      const earnings = deliveredOrders?.reduce((sum, o) => sum + (o.agent_earnings || 200), 0) || 0;
      setDeliveryEarnings(earnings);
    }

    setLoading(false);
  };

  const toggleOnlineStatus = async () => {
    if (!agent) return;
    const newStatus = !isOnline;
    const { error } = await supabase
      .from('delivery_agents')
      .update({ is_available: newStatus })
      .eq('id', agent.id);
    if (!error) {
      setIsOnline(newStatus);
      await fetchData();
    }
  };

  const canAcceptOrder = (order: Order) => {
    if (!agent || !isOnline) return false;
    const active = myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    if (active.length >= 2) return false;
    if (active.length > 0) {
      const existing = active[0];
      return order.seller_id === existing.seller_id && order.seller_type === existing.seller_type;
    }
    return true;
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!agent || !canAcceptOrder(order)) return;

    const { error } = await supabase
      .from('orders')
      .update({ delivery_agent_id: agent.id, status: 'accepted' })
      .eq('id', order.id);

    if (!error) {
      await fetchData();
      setDashboardKey(prev => prev + 1);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (!error) {
      await fetchData();
      setDashboardKey(prev => prev + 1);
    }
  };

  // Simulate withdrawal (in real app, call an API/Edge Function)
  const handleWithdraw = async (type: 'customer_funds' | 'delivery_earnings') => {
    const amount = type === 'customer_funds' ? customerFunds : deliveryEarnings;
    if (amount <= 0) {
      alert('No funds to withdraw');
      return;
    }

    if (type === 'customer_funds') {
      alert(`Withdrawing #${amount.toFixed(2)} to buy food. In real app, this would call your payment processor.`);
    } else {
      alert(`Withdrawing #${amount.toFixed(2)} earnings. In real app, this would send to agent's wallet.`);
    }

    // In real app: 
    // await supabase.from('withdrawals').insert({ agent_id: agent.id, amount, type });
    // Then refresh balances
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Delivery Agent Profile</h2>
          <p className="text-gray-600">Your account is not set up as a delivery agent.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delivery Agent</h1>
              <p className="text-sm text-gray-600">{profile?.full_name}</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div key={dashboardKey}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* BALANCES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Customer Funds */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer Funds</p>
                  <p className="text-2xl font-bold text-gray-900">#{customerFunds.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('customer_funds')}
                className="mt-3 w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                disabled={customerFunds <= 0}
              >
                Withdraw to Buy Food
              </button>
            </div>

            {/* Delivery Earnings */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">#{deliveryEarnings.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('delivery_earnings')}
                className="mt-3 w-full py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                disabled={deliveryEarnings <= 0}
              >
                Withdraw Earnings
              </button>
            </div>

            {/* Online Status */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <button
                  onClick={toggleOnlineStatus}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isOnline ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isOnline ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Rest of your dashboard (Active Orders, Available Orders) remains unchanged */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* My Active Orders */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Active Orders</h2>
              {myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                  <p className="text-gray-600">No active orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders
                    .filter(o => !['delivered', 'cancelled'].includes(o.status))
                    .map(order => (
                      <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                            <p className="text-sm text-gray-600">#{order.total.toFixed(2)}</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-start space-x-2 mb-4">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                          <p className="text-sm text-gray-700">{order.delivery_address}</p>
                        </div>
                        {order.delivery_notes && (
                          <p className="text-sm text-gray-600 mb-4 italic">{order.delivery_notes}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'accepted' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'preparing')}
                              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-semibold hover:bg-yellow-200"
                            >
                              Mark Preparing
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'ready')}
                              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200"
                            >
                              Mark Ready
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                              className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-200"
                            >
                              Pick Up
                            </button>
                          )}
                          {order.status === 'picked_up' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'delivered')}
                              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-200"
                            >
                              Mark Delivered
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrderForChat(order)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 flex items-center space-x-1"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Chat</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Available Orders */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Orders</h2>
              {availableOrders.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                  <p className="text-gray-600">
                    {isOnline ? 'No available orders' : 'Go online to receive orders'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availableOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{order.order_number}</h3>
                          <p className="text-sm text-gray-600">#{order.total.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 mb-4">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <p className="text-sm text-gray-700">{order.delivery_address}</p>
                      </div>
                      {canAcceptOrder(order) ? (
                        <button
                          onClick={() => handleAcceptOrder(order)}
                          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                        >
                          Accept Order
                        </button>
                      ) : (
                        <div className="text-center py-2 text-sm text-gray-500">
                          {myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length >= 2
                            ? 'Max orders reached (2)'
                            : 'Must be from same vendor as current orders'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedOrderForChat && (
        <ChatModal
          orderId={selectedOrderForChat.id}
          orderNumber={selectedOrderForChat.order_number}
          recipientName="Customer"
          onClose={() => setSelectedOrderForChat(null)}
        />
      )}
    </div>
  );
};