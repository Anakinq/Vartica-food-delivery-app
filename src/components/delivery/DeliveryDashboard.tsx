import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LogOut, MapPin, MessageCircle, Wallet, User, Menu,
  CheckCircle, AlertCircle, Banknote
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, DeliveryAgent } from '../../lib/supabase';
import { ChatModal } from '../shared/ChatModal';

// Interfaces
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
  { code: '307', name: 'OPay (Paycom)' },
  { code: '526', name: 'Parallex Bank' },
  { code: '501', name: 'Providus Bank' },
  { code: '559', name: 'Kuda Bank' },
  { code: '315', name: 'Renmoney' },
  { code: '566', name: 'Sparkle Microfinance' },
];

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut } = useAuth();

  // Core state
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [availableOrders, setAvailableOrders] = useState<FullOrder[]>([]);
  const [myOrders, setMyOrders] = useState<FullOrder[]>([]);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Bank state
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [registeringRecipient, setRegisteringRecipient] = useState(false);
  const [isBankVerified, setIsBankVerified] = useState(false);

  // Withdrawal state
  const [withdrawType, setWithdrawType] = useState<'customer_funds' | 'delivery_earnings'>('delivery_earnings');
  const [withdrawAmount, setWithdrawAmount] = useState<number | null>(null);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const withdrawCooldownRef = useRef<number | null>(null);

  // Helpers
  const formatCurrency = (n?: number) => `₦${(typeof n === 'number' ? n : 0).toFixed(2)}`;

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

  // 🔁 Unified data fetcher — called on mount, interval, and after key actions
  const fetchData = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // 1. Agent
      const { data: agentData } = await supabase
        .from('delivery_agents')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!agentData) {
        setAgent(null);
        setLoading(false);
        return;
      }

      setAgent(agentData);
      setIsOnline(agentData.is_available);

      // 2. Wallet
      const { data: walletData } = await supabase
        .from('agent_wallets')
        .select('customer_funds, delivery_earnings, total_balance')
        .eq('agent_id', agentData.id)
        .maybeSingle();

      setWallet({
        customer_funds: Number(walletData?.customer_funds) || 0,
        delivery_earnings: Number(walletData?.delivery_earnings) || 0,
        total_balance: Number(walletData?.total_balance) || 0,
      });

      // 3. Bank profile — 🔑 THIS IS KEY FOR PERSISTENT VERIFICATION
      const { data: bankData } = await supabase
        .from('agent_payout_profiles')
        .select('account_number, bank_code, recipient_code')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (bankData) {
        setBankAccount(bankData.account_number);
        setBankCode(bankData.bank_code);
        setIsBankVerified(!!bankData.recipient_code); // ✅ persists across logins
        const bank = BANK_OPTIONS.find(b => b.code === bankData.bank_code);
        setBankName(bank?.name || bankData.bank_code);
      }

      // 4. Orders
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

      // Attach order items & menu names (same as before — kept minimal for brevity)
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

      const menuItemIds = Object.values(orderItemsByOrderId)
        .flat()
        .map(item => item.menu_item_id)
        .filter(Boolean);
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

      // 5. Withdrawal history (NEW)
      const { data: hist } = await supabase
        .from('agent_withdrawals')
        .select('id, amount, status, transfer_code, created_at, type')
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setWithdrawHistory(hist || []);
    } catch (err) {
      console.error('fetchData error', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  // Initial + periodic fetch
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ✅ FIXED: Save bank + verify in one flow, and refresh after success
  const saveBankDetails = async () => {
    if (!profile?.id || bankAccount.length !== 10 || !bankCode) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit account number and select a bank.' });
      return;
    }

    setSavingBank(true);
    setMessage(null);

    try {
      // 1. Save bank details
      const { error: upsertError } = await supabase
        .from('agent_payout_profiles')
        .upsert(
          {
            user_id: profile.id,
            account_number: bankAccount,
            bank_code: bankCode,
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      // 2. Register with Paystack (server-side)
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        'https://jbqhbuogmxqzotlorahn.functions.supabase.co/registerPaystackRecipient',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ agent_user_id: profile.id }),
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      // ✅ CRITICAL: Refresh data so `recipient_code` is loaded → `isBankVerified = true`
      await fetchData(); // ← This ensures UI stays verified after login

      setMessage({ type: 'success', text: '✅ Bank verified! You can now withdraw funds.' });
    } catch (err: any) {
      console.error('Verification error:', err);
      setMessage({ type: 'error', text: `Bank verification failed: ${err.message}` });
    } finally {
      setSavingBank(false);
    }
  };

  // Open withdrawal modal with pre-filled amount
  const openWithdrawModal = (type: 'customer_funds' | 'delivery_earnings') => {
    if (!wallet) return;
    const max = type === 'customer_funds' ? wallet.customer_funds : wallet.delivery_earnings;
    setWithdrawType(type);
    setWithdrawAmount(max > 0 ? Number(max.toFixed(2)) : 0);
    setShowWithdrawModal(true);
    setMessage(null);
  };

  // Handle withdrawal submission
  const handleWithdraw = async () => {
    if (!agent || !wallet || withdrawAmount == null) return;

    if (!isBankVerified) {
      setMessage({ type: 'error', text: 'Bank not verified. Please verify your bank first.' });
      return;
    }

    const max = withdrawType === 'customer_funds' ? wallet.customer_funds : wallet.delivery_earnings;
    if (withdrawAmount <= 0 || withdrawAmount > max) {
      setMessage({ type: 'error', text: `Amount must be between ₦0.01 and ${formatCurrency(max)}.` });
      return;
    }

    // Frontend cooldown (UX only)
    if (withdrawCooldownRef.current && Date.now() - withdrawCooldownRef.current < 5000) {
      setMessage({ type: 'info', text: 'Please wait a few seconds before trying again.' });
      return;
    }
    withdrawCooldownRef.current = Date.now();

    setProcessingWithdrawal(true);
    setMessage(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error('Not authenticated');

      const payload = {
        agent_id: agent.id,
        amount_kobo: Math.round(withdrawAmount * 100),
        type: withdrawType,
      };

      const resp = await fetch(
        'https://jbqhbuogmxqzotlorahn.functions.supabase.co/handleAgentWithdrawal',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await resp.json();

      if (!resp.ok || !result.success) {
        throw new Error(result.error || 'Withdrawal failed');
      }

      setMessage({
        type: 'success',
        text: `✅ Withdrawal initiated! Ref: ${result.transfer_code || 'N/A'}`,
      });
      setShowWithdrawModal(false);
      await fetchData(); // refresh balance & history
    } catch (err: any) {
      console.error('Withdrawal error:', err);
      setMessage({ type: 'error', text: `❌ Withdrawal failed: ${err.message}` });
    } finally {
      setProcessingWithdrawal(false);
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
      setMessage({ type: 'error', text: 'Failed to update status' });
    }
  };

  // Accept order (unchanged)
  const handleAcceptOrder = async (order: FullOrder) => {
    if (!agent || !agent.is_available) return;
    const activeOrders = myOrders.filter(o => !['delivered', 'cancelled'].includes(o.status));
    if (activeOrders.length >= 2) {
      setMessage({ type: 'info', text: 'You can only have 2 active orders at a time.' });
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({
        delivery_agent_id: agent.id,
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (!error) {
      fetchData();
      setDashboardKey(prev => prev + 1);
    } else {
      setMessage({ type: 'error', text: 'Failed to accept order' });
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (!error) {
      fetchData();
      setDashboardKey(prev => prev + 1);
    } else {
      setMessage({ type: 'error', text: 'Failed to update status' });
    }
  };

  // ——— RENDER ———

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
          <button onClick={signOut} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Nav (mobile & desktop) omitted for brevity — keep yours */}

      <div key={dashboardKey} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Messages */}
        {message && (
          <div
            className={`p-3 rounded mb-4 border ${
              message.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Customer Funds */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Customer Funds</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(wallet?.customer_funds)}</p>
                <p className="text-xs text-gray-500 mt-1">For buying food</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Banknote className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => openWithdrawModal('customer_funds')}
                disabled={!wallet || wallet.customer_funds <= 0}
                className="flex-1 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Delivery Earnings */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Delivery Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(wallet?.delivery_earnings)}</p>
                <p className="text-xs text-gray-500 mt-1">Your profit</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => openWithdrawModal('delivery_earnings')}
                disabled={!wallet || wallet.delivery_earnings <= 0}
                className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Withdraw
              </button>
            </div>
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

        {/* Bank Setup */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
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
                  {BANK_OPTIONS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={saveBankDetails}
                disabled={savingBank || !bankAccount || !bankCode || bankAccount.length !== 10}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {savingBank ? 'Saving...' : '✅ Save & Verify Bank'}
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
                  {bankName} •••• {bankAccount.slice(-4)} — ready for withdrawals.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Orders & Withdrawal History — keep your existing UI */}
        {/* ... (omitted for length — use your second version’s clean layout) */}

        {/* Withdrawal History Section */}
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Withdrawal History</h2>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            {withdrawHistory.length === 0 ? (
              <p className="text-gray-600">No withdrawal activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {withdrawHistory.map((w) => (
                  <li key={w.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium">{formatCurrency(Number(w.amount) / 100)}</div>
                      <div className="text-xs text-gray-500">
                        {w.type === 'customer_funds' ? '🛒 Buy Food' : '💰 Earnings'} •{' '}
                        {new Date(w.created_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        w.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : w.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {w.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedOrderForChat && (
        <ChatModal
          orderId={selectedOrderForChat.id}
          orderNumber={selectedOrderForChat.order_number}
          recipientName="Customer"
          onClose={() => setSelectedOrderForChat(null)}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">
              Withdraw —{' '}
              {withdrawType === 'customer_funds' ? 'Customer Funds' : 'Delivery Earnings'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Available: {formatCurrency(withdrawType === 'customer_funds' ? wallet?.customer_funds : wallet?.delivery_earnings)}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={withdrawAmount ?? ''}
              onChange={(e) => setWithdrawAmount(e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full p-3 border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500"
            />
            {message?.type === 'error' && (
              <p className="text-red-600 text-sm mb-3">{message.text}</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setMessage(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={processingWithdrawal || withdrawAmount == null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processingWithdrawal ? 'Processing...' : 'Confirm Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};