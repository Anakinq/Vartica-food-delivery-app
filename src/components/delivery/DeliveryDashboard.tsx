import React, { useEffect, useState, useRef } from 'react';
import { LogOut, Package, MapPin, MessageCircle, Wifi, WifiOff, Wallet, User, Menu, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, DeliveryAgent } from '../../lib/supabase';
import { ChatModal } from '../shared/ChatModal';

interface FullOrder extends Order {
  order_items?: Array<{
    id: string;
    quantity: number;
    price: number;
    menu_item_id: string;
    menu_item?: { name: string };
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

  // Bank details
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [savedBank, setSavedBank] = useState(false);

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

    // 🔑 Critical fix: Lookup agent by delivery_agents.user_id = profiles.id
    const { data: agentData, error: agentError } = await supabase
      .from('delivery_agents')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (agentError) {
      console.error('Error fetching agent:', agentError);
      setLoading(false);
      return;
    }

    if (!agentData) {
      setLoading(false);
      return;
    }

    setAgent(agentData);
    setIsOnline(agentData.is_available);

    // Fetch bank (using profile.id = user_id)
    const { data: bankData } = await supabase
      .from('agent_payout_profiles')
      .select('account_number, bank_code')
      .eq('user_id', profile.id)
      .maybeSingle();
    if (bankData) {
      setBankAccount(bankData.account_number);
      setBankCode(bankData.bank_code);
      setSavedBank(true);
    }

    // Fetch orders assigned to agent (using delivery_agents.id)
    const { data: myOrdersData } = await supabase
      .from('orders')
      .select('id, order_number, total, status, delivery_address, delivery_notes, seller_id, seller_type, created_at')
      .eq('delivery_agent_id', agentData.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

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

    // Fetch order items (optimized)
    const allOrderIds = [...(myOrdersData || []), ...availableOrdersData].map(o => o.id);
    let orderItemsByOrderId: Record<string, any[]> = {};

    if (allOrderIds.length > 0) {
      const { data: orderItemsData } = await supabase
        .from('order_items')
        .select('id, order_id, quantity, price, menu_item_id')
        .in('order_id', allOrderIds);

      orderItemsByOrderId = (orderItemsData || []).reduce((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {} as Record<string, any[]>);
    }

    // Fetch menu items
    const menuItemIds = Object.values(orderItemsByOrderId).flat().map(item => item.menu_item_id).filter(Boolean);
    let menuItemMap: Record<string, { name: string }> = {};
    if (menuItemIds.length > 0) {
      const { data: menuItemsData } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);

      menuItemMap = (menuItemsData || []).reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, { name: string }>);
    }

    // Attach items
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

    // Calculate balances using TODAY's data
    const today = new Date().toISOString().split('T')[0];

    // Customer Funds = sum of 'total' from paid orders
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('total')
      .eq('delivery_agent_id', agentData.id)
      .eq('payment_status', 'paid')
      .gte('created_at', today);
    const funds = paidOrders?.reduce((sum, o) => sum + o.total, 0) || 0;
    setCustomerFunds(funds);

    // Delivery Earnings = sum of 'agent_earnings' from delivered orders
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('agent_earnings')
      .eq('delivery_agent_id', agentData.id)
      .eq('status', 'delivered')
      .gte('created_at', today);
    const earnings = deliveredOrders?.reduce((sum, o) => sum + (o.agent_earnings || 200), 0) || 0;
    setDeliveryEarnings(earnings);

    setLoading(false);
  };

  const saveBankDetails = async () => {
    if (!profile?.id || !bankAccount || !bankCode) return;
    setSavingBank(true);

    const { error } = await supabase
      .from('agent_payout_profiles')
      .upsert(
        {
          user_id: profile.id,
          account_number: bankAccount,
          bank_code: bankCode,
        },
        { onConflict: 'user_id' }
      );

    if (!error) {
      setSavedBank(true);
    } else {
      alert('❌ Failed to save bank details');
      console.error(error);
    }
    setSavingBank(false);
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

    if (!profile?.id) {
      alert('Profile not found');
      return;
    }

    const { data: bankData } = await supabase
      .from('agent_payout_profiles')
      .select('account_number, bank_code')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!bankData) {
      alert('⚠️ Please save your bank account first!');
      return;
    }

    const confirmed = confirm(`Withdraw ₦${amount.toFixed(2)} to your bank ending ${bankData.account_number.slice(-4)}?`);
    if (!confirmed) return;

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Not authenticated');

      // 🔑 Critical: Send agent_id (delivery_agents.id) not user_id
      const response = await fetch('/functions/v1/withdraw-agent-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          agent_id: agent?.id, // 👈 Must be delivery_agents.id for order lookup
          amount_kobo: Math.round(amount * 100),
          type,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        alert(`✅ Withdrawal initiated!\nRef: ${result.transfer_code}`);
        await fetchData();
      } else {
        alert(`❌ Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Withdrawal failed. Please try again.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-xl shadow-sm max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">
            Your account isn't set up as a delivery agent. Contact admin to get approved.
          </p>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

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
          {/* BALANCES - Modern Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Customer Funds</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₦{customerFunds.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('customer_funds')}
                disabled={customerFunds <= 0}
                className="mt-3 w-full py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition"
              >
                Withdraw to Buy Food
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Delivery Earnings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">₦{deliveryEarnings.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('delivery_earnings')}
                disabled={deliveryEarnings <= 0}
                className="mt-3 w-full py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition"
              >
                Withdraw Earnings
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-500">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Status</p>
                  <p className={`text-xl font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <button
                  onClick={toggleOnlineStatus}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isOnline ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  aria-label={isOnline ? 'Go offline' : 'Go online'}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isOnline ? 'translate-x-6' : ''
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Payout Settings — Auto-Hide After Save */}
          {!savedBank ? (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">💳 Set Up Payout</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter your bank details to receive payments directly.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 0123456789"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Bank</option>
                    <option value="044">Access Bank</option>
                    <option value="011">First Bank</option>
                    <option value="058">GTBank</option>
                    <option value="033">UBA</option>
                    <option value="057">Zenith Bank</option>
                    <option value="070">Fidelity</option>
                  </select>
                </div>
                <button
                  onClick={saveBankDetails}
                  disabled={savingBank || !bankAccount || !bankCode}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition"
                >
                  {savingBank ? 'Saving...' : '✅ Save Bank Details'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 p-1.5 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Bank Successfully Saved!</h3>
                  <p className="text-green-700 mt-1">
                    You can now withdraw funds. To update your bank details, visit your{' '}
                    <button
                      onClick={() => onShowProfile?.()}
                      className="inline text-blue-600 hover:text-blue-800 font-medium underline"
                    >
                      Profile
                    </button>.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                            <p className="text-sm text-gray-600 font-medium">₦{order.total.toFixed(2)}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>

                        {order.order_items && order.order_items.length > 0 && (
                          <div className="mb-3 pt-2 border-t border-gray-100">
                            {order.order_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-0.5">
                                <span className="text-gray-800">{item.menu_item?.name || 'Unknown Item'}</span>
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
                          <p className="text-sm text-gray-600 font-medium">₦{order.total.toFixed(2)}</p>
                        </div>
                      </div>

                      {order.order_items && order.order_items.length > 0 && (
                        <div className="mb-3 pt-2 border-t border-gray-100">
                          {order.order_items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm py-0.5">
                              <span className="text-gray-800">{item.menu_item?.name || 'Unknown Item'}</span>
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
