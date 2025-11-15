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
  total_earnings: number;
  current_balance: number;
  pending_withdrawal: number;
  total_withdrawals: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  rejection_reason?: string;
}

interface DeliveryDashboardProps {
  onShowProfile?: () => void;
}

// ✅ Full Nigerian bank list (Paystack-compliant bank codes)
const BANK_OPTIONS = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '035A', name: 'ALAT by WEMA' },
  { code: '401', name: 'ASO Savings and Loans' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '562', name: 'Ekondo Microfinance Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '901', name: 'FSDH Merchant Bank Limited' },
  { code: '00103', name: 'Globus Bank' },
  { code: '100022', name: 'GoMoney' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '559', name: 'Kuda Bank' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '999992', name: 'OPay' },
  { code: '526', name: 'Parallex Bank' },
  { code: '999991', name: 'PalmPay' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '125', name: 'Rubies MFB' },
  { code: '51310', name: 'Sparkle Microfinance Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '302', name: 'TAJ Bank' },
  { code: '102', name: 'Titan Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '566', name: 'VFD Microfinance Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut } = useAuth();

  // Core state
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  // Wallet state
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
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
        .select('total_earnings, current_balance, pending_withdrawal, total_withdrawals')
        .eq('agent_id', agentData.id)
        .maybeSingle();

      setWallet({
        total_earnings: Number(walletData?.total_earnings) || 0,
        current_balance: Number(walletData?.current_balance) || 0,
        pending_withdrawal: Number(walletData?.pending_withdrawal) || 0,
        total_withdrawals: Number(walletData?.total_withdrawals) || 0,
      });

      // 3. Withdrawal Requests History
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('id, amount, bank_name, account_number, status, created_at, approved_at, rejection_reason')
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setWithdrawalRequests(withdrawals || []);

      // 4. Bank profile (optional for manual withdrawals)
      const { data: bankData } = await supabase
        .from('agent_payout_profiles')
        .select('account_number, bank_code')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (bankData) {
        setBankAccount(bankData.account_number);
        setBankCode(bankData.bank_code);
        const bank = BANK_OPTIONS.find(b => b.code === bankData.bank_code);
        setBankName(bank?.name || 'Unknown Bank');
        setIsBankVerified(true); // Bank saved = verified for manual system
      }

      // 5. Orders
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

  // Save bank details (simplified - no Paystack verification)
  const saveBankDetails = async () => {
    if (!profile?.id || !agent || bankAccount.length !== 10 || !bankCode) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit account number and select a bank.' });
      return;
    }

    setSavingBank(true);
    setMessage(null);

    try {
      const selectedBank = BANK_OPTIONS.find(b => b.code === bankCode);

      const { error: upsertError } = await supabase
        .from('agent_payout_profiles')
        .upsert(
          {
            user_id: profile.id,
            account_number: bankAccount,
            bank_code: bankCode,
            bank_name: selectedBank?.name || 'Unknown Bank',
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      await fetchData();
      setMessage({ type: 'success', text: '✅ Bank details saved successfully!' });
    } catch (err: any) {
      console.error('Save bank error:', err);
      setMessage({ type: 'error', text: `Failed to save bank details: ${err.message}` });
    } finally {
      setSavingBank(false);
    }
  };

  // Open withdrawal modal
  const openWithdrawModal = () => {
    if (!wallet || wallet.current_balance <= 0) {
      setMessage({ type: 'error', text: 'Insufficient balance.' });
      return;
    }
    setWithdrawAmount(wallet.current_balance);
    setShowWithdrawModal(true);
    setMessage(null);
  };

  // Submit withdrawal request (manual - admin will approve)
  const handleWithdrawRequest = async () => {
    if (!agent || !wallet || !profile || withdrawAmount == null) return;

    if (!isBankVerified || !bankAccount || !bankCode) {
      setMessage({ type: 'error', text: 'Please save your bank details first.' });
      return;
    }

    if (withdrawAmount <= 0 || withdrawAmount > wallet.current_balance) {
      setMessage({ type: 'error', text: `Amount must be between ₦0.01 and ${formatCurrency(wallet.current_balance)}.` });
      return;
    }

    setProcessingWithdrawal(true);
    setMessage(null);

    try {
      // Create withdrawal request
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          agent_id: agent.id,
          rider_name: profile.full_name,
          amount: withdrawAmount,
          bank_name: bankName,
          account_number: bankAccount,
          status: 'pending',
        });

      if (error) throw error;

      // Update wallet pending_withdrawal
      await supabase
        .from('agent_wallets')
        .update({ pending_withdrawal: wallet.pending_withdrawal + withdrawAmount })
        .eq('agent_id', agent.id);

      setMessage({
        type: 'success',
        text: `✅ Withdrawal request submitted! Admin will process it manually.`,
      });
      setShowWithdrawModal(false);
      await fetchData(); // refresh
    } catch (err: any) {
      console.error('Withdrawal request error:', err);
      setMessage({ type: 'error', text: `❌ Failed: ${err.message}` });
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
            className={`p-3 rounded mb-4 border ${message.type === 'error'
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Earnings */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(wallet?.total_earnings)}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wallet className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Current Balance */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Current Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(wallet?.current_balance)}</p>
                <p className="text-xs text-gray-500 mt-1">Available</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="mt-3">
              <button
                onClick={openWithdrawModal}
                disabled={!wallet || wallet.current_balance <= 0}
                className="w-full py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Request Withdrawal
              </button>
            </div>
          </div>

          {/* Pending Withdrawal */}
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(wallet?.pending_withdrawal)}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting admin</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
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

        {/* Bank Setup */}
        {!isBankVerified ? (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-200">
            <div className="flex items-start space-x-3 mb-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <h3 className="text-lg font-bold text-yellow-800">⚠️ Bank Details Required</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Please save your bank account details. Admin will use this for manual withdrawals.
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
                <h3 className="font-semibold text-green-800">✅ Bank Details Saved!</h3>
                <p className="text-green-700 mt-1">
                  {bankName} •••• {bankAccount.slice(-4)} — Admin will use this for manual withdrawals.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Orders & Withdrawal History — keep your existing UI */}
        {/* ... (omitted for length — use your second version’s clean layout) */}

        {/* Withdrawal History Section */}
        <div className="mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Withdrawal Requests</h2>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            {withdrawalRequests.length === 0 ? (
              <p className="text-gray-600">No withdrawal requests yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Bank</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.map((req) => (
                      <tr key={req.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-3 text-sm text-gray-600">
                          {new Date(req.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 text-sm font-medium text-gray-900">
                          {formatCurrency(Number(req.amount))}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-600">
                          {req.bank_name}<br />
                          <span className="text-xs text-gray-500">•••• {req.account_number.slice(-4)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${req.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : req.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            {req.status === 'approved' && '✅ '}
                            {req.status === 'rejected' && '❌ '}
                            {req.status === 'pending' && '⏳ '}
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                          {req.approved_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(req.approved_at).toLocaleDateString()}
                            </div>
                          )}
                          {req.rejection_reason && (
                            <div className="text-xs text-red-600 mt-1">{req.rejection_reason}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

      {/* Withdrawal Request Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Request Withdrawal</h3>
            <p className="text-sm text-gray-600 mb-3">
              Available Balance: <span className="font-bold text-green-600">{formatCurrency(wallet?.current_balance)}</span>
            </p>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                📌 <strong>Note:</strong> Your request will be reviewed by admin. Payment will be sent manually to your bank account.
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={wallet?.current_balance}
              value={withdrawAmount ?? ''}
              onChange={(e) => setWithdrawAmount(e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full p-3 border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500"
            />
            <div className="mb-4 text-sm text-gray-600">
              <p><strong>Bank:</strong> {bankName}</p>
              <p><strong>Account:</strong> •••• {bankAccount.slice(-4)}</p>
            </div>
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
                onClick={handleWithdrawRequest}
                disabled={processingWithdrawal || withdrawAmount == null || withdrawAmount <= 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processingWithdrawal ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};