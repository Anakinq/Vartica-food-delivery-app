import React, { useEffect, useState, useRef } from 'react';
import { LogOut, Package, MapPin, MessageCircle, Wifi, WifiOff, Wallet, User, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, DeliveryAgent } from '../../lib/supabase';
import { ChatModal } from '../shared/ChatModal';

// Extended Order type with order_items
interface FullOrder extends Order {
  order_items?: Array<{
    id: string;
    quantity: number;
    price: number;
    menu_item_id: string;
    menu_item?: {
      name: string;
    };
  }>;
}

interface DeliveryDashboardProps {
  onShowProfile?: () => void;
}

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut } = useAuth();
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [availableOrders, setAvailableOrders] = useState<FullOrder[]>([]);
  const [myOrders, setMyOrders] = useState<FullOrder[]>([]);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [customerFunds, setCustomerFunds] = useState(0);
  const [deliveryEarnings, setDeliveryEarnings] = useState(0);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      // Fetch my orders (basic info)
      const { data: myOrdersData } = await supabase
        .from('orders')
        .select('id, order_number, total, status, delivery_address, delivery_notes, seller_id, seller_type, created_at')
        .eq('delivery_agent_id', agentData.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      // Fetch available orders (basic info)
      let availableOrdersData: FullOrder[] = [];
      if (agentData.is_available) {
        const { data: available } = await supabase
          .from('orders')
          .select('id, order_number, total, status, delivery_address, delivery_notes, seller_id, seller_type, created_at')
          .is('delivery_agent_id', null)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        availableOrdersData = available || [];
      }

      // Fetch order items WITHOUT JOIN to avoid 400 error
      const allOrderIds = [...(myOrdersData || []), ...availableOrdersData].map(o => o.id);
      let orderItemsByOrderId: Record<string, any[]> = {};

      if (allOrderIds.length > 0) {
        const { data: orderItemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('id, order_id, quantity, price, menu_item_id') // ← no join!
          .in('order_id', allOrderIds);

        if (itemsError) {
          console.error('Failed to fetch order items:', itemsError);
        }

        orderItemsByOrderId = (orderItemsData || []).reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push(item);
          return acc;
        }, {} as Record<string, any[]>);
      }

      // Fetch menu item names in a separate query
      const menuItemIds = Object.values(orderItemsByOrderId)
        .flat()
        .map(item => item.menu_item_id)
        .filter(Boolean);

      let menuItemMap: Record<string, { name: string }> = {};
      if (menuItemIds.length > 0) {
        const { data: menuItemsData, error: menuError } = await supabase
          .from('menu_items')
          .select('id, name')
          .in('id', menuItemIds);

        if (menuError) {
          console.error('Failed to fetch menu items:', menuError);
        }

        menuItemMap = (menuItemsData || []).reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as Record<string, { name: string }>);
      }

      // Attach items + names to orders
      const myOrdersWithItems = (myOrdersData || []).map(order => ({
        ...order,
        order_items: (orderItemsByOrderId[order.id] || []).map(item => ({
          ...item,
          menu_item: menuItemMap[item.menu_item_id] || { name: 'Unknown Item' }
        }))
      }));

      const availableOrdersWithItems = availableOrdersData.map(order => ({
        ...order,
        order_items: (orderItemsByOrderId[order.id] || []).map(item => ({
          ...item,
          menu_item: menuItemMap[item.menu_item_id] || { name: 'Unknown Item' }
        }))
      }));

      setMyOrders(myOrdersWithItems);
      setAvailableOrders(availableOrdersWithItems);

      // Earnings & funds logic
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: paidOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('delivery_agent_id', agentData.id)
        .eq('payment_status', 'paid')
        .gte('created_at', today.toISOString());
      const funds = paidOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
      setCustomerFunds(funds);

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

  const canAcceptOrder = (order: FullOrder) => {
    if (!agent || !isOnline) return false;
    const active = myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    if (active.length >= 2) return false;
    if (active.length > 0) {
      const existing = active[0];
      return order.seller_id === existing.seller_id && order.seller_type === existing.seller_type;
    }
    return true;
  };

  const handleAcceptOrder = async (order: FullOrder) => {
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

  const handleWithdraw = async (type: 'customer_funds' | 'delivery_earnings') => {
    const amount = type === 'customer_funds' ? customerFunds : deliveryEarnings;
    if (amount <= 0) {
      alert('No funds to withdraw');
      return;
    }

    if (type === 'customer_funds') {
      alert(`Withdrawing #${amount.toFixed(2)} to buy food.`);
    } else {
      alert(`Withdrawing #${amount.toFixed(2)} earnings.`);
    }
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

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'picked_up': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Hamburger Menu */}
      <div className="md:hidden bg-white shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center h-16 px-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delivery Agent</h1>
            <p className="text-sm text-gray-600">{profile?.full_name}</p>
          </div>
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 text-gray-700"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {showMobileMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
            <div
              ref={menuRef}
              className="bg-white w-64 h-full p-6"
            >
              <button
                onClick={() => setShowMobileMenu(false)}
                className="float-right p-2 text-gray-500 text-2xl"
                aria-label="Close menu"
              >
                &times;
              </button>
              <div className="mt-8 space-y-4">
                <button
                  onClick={() => {
                    onShowProfile?.();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 w-full text-left py-2"
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={() => {
                    signOut();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center space-x-2 text-gray-700 hover:text-red-600 w-full text-left py-2"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="hidden md:block bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Delivery Agent</h1>
              <p className="text-sm text-gray-600">{profile?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onShowProfile}
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">Profile</span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div key={dashboardKey} className="pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* BALANCES */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Customer Funds</p>
                  <p className="text-lg font-bold text-gray-900">#{customerFunds.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('customer_funds')}
                className="mt-2 w-full py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                disabled={customerFunds <= 0}
              >
                Withdraw to Buy Food
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-green-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Delivery Earnings</p>
                  <p className="text-lg font-bold text-gray-900">#{deliveryEarnings.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('delivery_earnings')}
                className="mt-2 w-full py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                disabled={deliveryEarnings <= 0}
              >
                Withdraw Earnings
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <p className={`text-sm font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <button
                  onClick={toggleOnlineStatus}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isOnline ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  aria-label={isOnline ? 'Go offline' : 'Go online'}
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

          <div className="space-y-6">
            {/* My Active Orders */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">My Active Orders</h2>
              {myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length === 0 ? (
                <div className="bg-white rounded-xl p-5 text-center border border-gray-200">
                  <p className="text-gray-600">No active orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders
                    .filter(o => !['delivered', 'cancelled'].includes(o.status))
                    .map(order => (
                      <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{order.order_number}</h3>
                            <p className="text-sm text-gray-600 font-medium">#{order.total.toFixed(2)}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Food Items */}
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="mb-3 pt-2 border-t border-gray-100">
                            {order.order_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-0.5">
                                <span className="text-gray-800">
                                  {item.menu_item?.name || 'Unknown Item'}
                                </span>
                                <span className="font-medium">×{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-start space-x-2 mb-3">
                          <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-800">{order.delivery_address}</p>
                        </div>
                        {order.delivery_notes && (
                          <p className="text-sm text-gray-700 mb-3 italic pl-6">"{order.delivery_notes}"</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {order.status === 'accepted' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'preparing')}
                              className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-semibold hover:bg-yellow-200 min-w-[100px]"
                            >
                              Preparing
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'ready')}
                              className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold hover:bg-blue-200 min-w-[100px]"
                            >
                              Ready
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                              className="px-3 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-semibold hover:bg-orange-200 min-w-[100px]"
                            >
                              Pick Up
                            </button>
                          )}
                          {order.status === 'picked_up' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'delivered')}
                              className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-semibold hover:bg-green-200 min-w-[100px]"
                            >
                              Delivered
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedOrderForChat(order)}
                            className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-200 flex items-center space-x-1 min-w-[80px]"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
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
              <h2 className="text-xl font-bold text-gray-900 mb-3">Available Orders</h2>
              {availableOrders.length === 0 ? (
                <div className="bg-white rounded-xl p-5 text-center border border-gray-200">
                  <p className="text-gray-600">
                    {isOnline ? 'No available orders' : 'Go online to receive orders'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{order.order_number}</h3>
                          <p className="text-sm text-gray-600 font-medium">#{order.total.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Food Items */}
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="mb-3 pt-2 border-t border-gray-100">
                          {order.order_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm py-0.5">
                              <span className="text-gray-800">
                                {item.menu_item?.name || 'Unknown Item'}
                              </span>
                              <span className="font-medium">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-start space-x-2 mb-3">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-800">{order.delivery_address}</p>
                      </div>

                      {canAcceptOrder(order) ? (
                        <button
                          onClick={() => handleAcceptOrder(order)}
                          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700"
                        >
                          Accept Order
                        </button>
                      ) : (
                        <div className="text-center py-2 text-xs text-gray-600 bg-gray-50 rounded-lg">
                          {myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length >= 2
                            ? 'Max 2 orders allowed'
                            : 'Must match current vendor'}
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