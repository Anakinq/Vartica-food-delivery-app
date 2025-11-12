import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LogOut, Package, MapPin, MessageCircle, Wifi, WifiOff,
  Wallet, User, Menu, CheckCircle, AlertCircle, Banknote
} from 'lucide-react';
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

interface AgentWallet {
  customer_funds: number;
  delivery_earnings: number;
  total_balance: number;
}

interface DeliveryDashboardProps {
  onShowProfile?: () => void;
}

// ✅ Full Nigerian bank list (Paystack-compliant)
const BANK_OPTIONS = [
  { code: '044', name: 'Access Bank' },
  { code: '011', name: 'First Bank' },
  { code: '058', name: 'GTBank' },
  { code: '033', name: 'UBA' },
  { code: '057', name: 'Zenith Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '214', name: 'FCMB' },
  { code: '035', name: 'Sterling Bank' },
  { code: '050', name: 'Ecobank' },
  { code: '032', name: 'Union Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '068', name: 'Stanbic IBTC' },
  { code: '232', name: 'Sterling Bank' },
  { code: '307', name: 'OPay (Paycom)' },
  { code: '526', name: 'Parallex Bank' },
  { code: '501', name: 'Providus Bank' },
  { code: '559', name: 'Kuda Bank' },
  { code: '315', name: 'Renmoney' },
  { code: '566', name: 'Sparkle Microfinance' },
];

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut } = useAuth();
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [availableOrders, setAvailableOrders] = useState<FullOrder[]>([]);
  const [myOrders, setMyOrders] = useState<FullOrder[]>([]);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [registeringRecipient, setRegisteringRecipient] = useState(false);
  const [isBankVerified, setIsBankVerified] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!profile?.id) return;

    try {
      // 1. Fetch agent
      const { data: agentData, error: agentError } = await supabase
        .from('delivery_agents')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (agentError) throw agentError;
      if (!agentData) {
        setLoading(false);
        return;
      }

      setAgent(agentData);
      setIsOnline(agentData.is_available);

      // 2. Fetch wallet (REAL wallet balance — not recalculated)
      const { data: walletData } = await supabase
        .from('agent_wallets')
        .select('customer_funds, delivery_earnings, total_balance')
        .eq('agent_id', agentData.id)
        .maybeSingle();

      if (walletData) {
        setWallet({
          customer_funds: Number(walletData.customer_funds) || 0,
          delivery_earnings: Number(walletData.delivery_earnings) || 0,
          total_balance: Number(walletData.total_balance) || 0,
        });
      } else {
        setWallet({ customer_funds: 0, delivery_earnings: 0, total_balance: 0 });
      }

      // 3. Fetch bank & verification status
      const { data: bankData } = await supabase
        .from('agent_payout_profiles')
        .select('account_number, bank_code, recipient_code')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (bankData) {
        setBankAccount(bankData.account_number);
        setBankCode(bankData.bank_code);
        setIsBankVerified(!!bankData.recipient_code);
        const bank = BANK_OPTIONS.find(b => b.code === bankData.bank_code);
        setBankName(bank?.name || bankData.bank_code);
      }
    } catch (err) {
      // Fetch error handled silently
    } finally {
      setLoading(false);
    }

    // Fetch orders (separate for performance)
    try {
      const { data: agentData } = await supabase
        .from('delivery_agents')
        .select('id, is_available')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!agentData) return;

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

      // Attach order items
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

      const attachItems = (orders: FullOrder[]) =>
        orders.map(order => ({
          ...order,
          order_items: (orderItemsByOrderId[order.id] || []).map(item => ({
            ...item,
            menu_item: menuItemMap[item.menu_item_id] || { name: 'Unknown Item' }
          }))
        }));

      setMyOrders(attachItems(myOrdersData || []));
      setAvailableOrders(attachItems(availableOrdersData));
    } catch (err) {
      // Orders fetch error handled silently
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Save bank details
  const saveBankDetails = async () => {
    if (!profile?.id || !bankAccount || !bankCode || bankAccount.length !== 10) {
      alert('Please enter a valid 10-digit account number and select a bank.');
      return;
    }

    setSavingBank(true);
    try {
      const { error } = await supabase
        .from('agent_payout_profiles')
        .upsert({
          user_id: profile.id,
          account_number: bankAccount,
          bank_code: bankCode,
        }, { onConflict: 'user_id' });

      if (error) throw error;
      await registerPaystackRecipient();
    } catch (err) {
      alert('❌ Failed to save bank details');
    } finally {

    }
  };

  // ✅ FIXED: Hardcoded URL, no env, no spaces
  const registerPaystackRecipient = async () => {
    if (!profile?.id) return;

    setRegisteringRecipient(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Not authenticated');

      // 🔑 Hardcoded Supabase Function URL
      const response = await fetch(
        'https://jbqhbuogmxqzotlorahn.functions.supabase.co/registerPaystackRecipient',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ agent_user_id: profile.id }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setIsBankVerified(true);
        alert('✅ Bank verified! You can now withdraw funds.');
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (err: any) {
      alert(`⚠️ Bank verification failed: ${err.message}`);
    } finally {
      setRegisteringRecipient(false);
    }
  };

  // ✅ FIXED: Hardcoded URL, no trailing spaces
  const handleWithdraw = async (type: 'customer_funds' | 'delivery_earnings') => {
    if (!agent || !wallet) return;

    const amount = type === 'customer_funds' ? wallet.customer_funds : wallet.delivery_earnings;
    if (amount <= 0) {
      alert(`No ${type.replace('_', ' ')} available to withdraw.`);
      return;
    }

    if (!isBankVerified) {
      const confirmed = confirm('Your bank is not verified. Would you like to verify now?');
      if (confirmed) {
        await registerPaystackRecipient();
      }
      return;
    }

    const confirmed = confirm(
      `Withdraw ₦${amount.toFixed(2)} to your ${bankName || 'bank'} ending ${bankAccount.slice(-4)}?\n` +
      `This is for: ${type === 'customer_funds' ? 'buying food' : 'your earnings'}.`
    );
    if (!confirmed) return;

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Not authenticated');

      // 🔑 Hardcoded Supabase Function URL (no spaces!)
      const response = await fetch(
        'https://jbqhbuogmxqzotlorahn.functions.supabase.co/handleAgentWithdrawal',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            agent_id: agent.id,
            amount_kobo: Math.round(amount * 100),
            type,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`✅ Withdrawal successful!\nRef: ${result.transfer_code}\nFunds arrive in 1–5 mins.`);
        fetchData();
      } else {
        alert(`❌ Withdrawal failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`❌ Withdrawal failed: ${err.message}`);
    }
  };

  // Toggle online status
  const toggleOnlineStatus = async () => {
    if (!agent) return;
    const newStatus = !isOnline;
    const { error } = await supabase
      .from('delivery_agents')
      .update({ is_available: newStatus })
      .eq('id', agent.id);

    if (!error) {
      setIsOnline(newStatus);
      fetchData();
    } else {
      alert('Failed to update status');
    }
  };

  // Accept order
  const handleAcceptOrder = async (order: FullOrder) => {
    if (!agent || !agent.is_available) return;

    const activeOrders = myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    if (activeOrders.length >= 2) {
      alert('You can only have 2 active orders at a time.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        delivery_agent_id: agent.id,
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (!error) {
      fetchData();
      setDashboardKey(prev => prev + 1);
    } else {
      alert('Failed to accept order');
    }
  };

  // Update order status
  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (!error) {
      fetchData();
      setDashboardKey(prev => prev + 1);
    } else {
      alert('Failed to update status');
    }
  };

  // Status badge colors
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      accepted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      preparing: 'bg-blue-100 text-blue-800 border-blue-200',
      ready: 'bg-orange-100 text-orange-800 border-orange-200',
      picked_up: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Loading & agent not found states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-xl shadow-sm max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not a Delivery Agent</h2>
          <p className="text-gray-600 mb-4">
            Your account isn’t approved as a delivery agent. Contact admin for onboarding.
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center h-16 px-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delivery Agent</h1>
            <p className="text-sm text-gray-600">{profile?.full_name}</p>
          </div>
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 text-gray-700"
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

      {/* Desktop Nav */}
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
          {/* BALANCE CARDS */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 mb-6">
            {/* Customer Funds */}
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Customer Funds</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₦{wallet?.customer_funds?.toFixed(2) ?? '0.00'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">For buying food</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('customer_funds')}
                disabled={!wallet || wallet.customer_funds <= 0}
                className="mt-3 w-full py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Withdraw to Buy Food
              </button>
            </div>

            {/* Delivery Earnings */}
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Delivery Earnings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₦{wallet?.delivery_earnings?.toFixed(2) ?? '0.00'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Your profit</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <button
                onClick={() => handleWithdraw('delivery_earnings')}
                disabled={!wallet || wallet.delivery_earnings <= 0}
                className="mt-3 w-full py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Withdraw Earnings
              </button>
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-500">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                  <p className={`text-xl font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <button
                  onClick={toggleOnlineStatus}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                  aria-label={isOnline ? 'Go offline' : 'Go online'}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isOnline ? 'translate-x-6' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* BANK SETUP */}
          {!isBankVerified ? (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-200">
              <div className="flex items-start space-x-3 mb-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <h3 className="text-lg font-bold text-yellow-800">⚠️ Bank Not Verified</h3>
              </div>
              <p className="text-gray-600 mb-4">
                To withdraw funds automatically, please save and verify your bank account.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
                  <select
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Bank</option>
                    {BANK_OPTIONS.map(bank => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={saveBankDetails}
                  disabled={savingBank || registeringRecipient || !bankAccount || !bankCode || bankAccount.length !== 10}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {registeringRecipient ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying Bank...
                    </span>
                  ) : savingBank ? 'Saving...' : '✅ Save & Verify Bank'}
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
                  <h3 className="font-semibold text-green-800">✅ Bank Verified!</h3>
                  <p className="text-green-700 mt-1">
                    {bankName} •••• {bankAccount.slice(-4)} — ready for instant withdrawals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Orders Sections */}
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
                            <p className="text-sm text-gray-600 font-medium">₦{Number(order.total).toFixed(2)}</p>
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
                          <p className="text-sm text-gray-600 font-medium">₦{Number(order.total).toFixed(2)}</p>
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

                      {agent?.is_available ? (
                        <button
                          onClick={() => handleAcceptOrder(order)}
                          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700"
                        >
                          Accept Order
                        </button>
                      ) : (
                        <div className="text-center py-2 text-xs text-gray-600 bg-gray-50 rounded-lg">
                          Go online to accept orders
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

      {/* Chat Modal */}
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