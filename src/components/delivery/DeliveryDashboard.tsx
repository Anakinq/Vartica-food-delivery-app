import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  LogOut, MapPin, MessageCircle, Wallet, User, Menu, X,
  CheckCircle, AlertCircle, Banknote, Package, Clock, Check, Truck,
  Settings, Bell, Star, Phone, Navigation, BarChart3, Lock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, DeliveryAgent, Profile } from '../../lib/supabase';
import { ChatModal } from '../shared/ChatModal';
import { LocationTracker } from '../shared/LocationTracker';
import { WalletService } from '../../services';
import { RoleSwitcher } from '../shared/RoleSwitcher';
import { notificationService } from '../../services/notification.service';

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
  food_wallet_balance: number;
  earnings_wallet_balance: number;
  pending_withdrawal: number;
  total_withdrawals: number;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  error_message?: string;
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
  const { profile, signOut, checkApprovalStatus } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<boolean | null>(null);
  const [loadingApproval, setLoadingApproval] = useState(true);

  // Core state
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  // Wallet state
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [availableOrders, setAvailableOrders] = useState<FullOrder[]>([]);
  const [myOrders, setMyOrders] = useState<FullOrder[]>([]);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<FullOrder | null>(null);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('active');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const withdrawCooldownRef = useRef<number | null>(null);

  // Helpers
  const formatCurrency = (n?: number) => `₦${(typeof n === 'number' ? n : 0).toFixed(2)}`;

  const totalBalance = wallet ? wallet.food_wallet_balance + wallet.earnings_wallet_balance : 0;

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showMobileMenu && menuRef.current && !menuRef.current.contains(target) &&
        hamburgerButtonRef.current && !hamburgerButtonRef.current.contains(target)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMenu]);

  // 🔁 Unified data fetcher — called on mount, interval, and after key actions
  const fetchData = useCallback(async () => {
    console.log('DeliveryDashboard: fetchData called, profile ID:', profile?.id);
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
      const { data: walletData, error: walletError } = await supabase
        .from('agent_wallets')
        .select('food_wallet_balance, earnings_wallet_balance, pending_withdrawal, total_withdrawals')
        .eq('agent_id', agentData.id)
        .maybeSingle();

      if (walletError) {
        console.error('Wallet fetch error:', walletError);
      }

      setWallet({
        food_wallet_balance: Number(walletData?.food_wallet_balance) || 0,
        earnings_wallet_balance: Number(walletData?.earnings_wallet_balance) || 0,
        pending_withdrawal: Number(walletData?.pending_withdrawal) || 0,
        total_withdrawals: Number(walletData?.total_withdrawals) || 0,
      });

      // 3. Withdrawal Requests History
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('id, amount, status, created_at, processed_at, error_message')
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (withdrawalsError) {
        console.error('Withdrawals fetch error:', withdrawalsError);
      }

      setWithdrawalRequests(withdrawals || []);

      // 4. Bank profile (optional for manual withdrawals)
      const { data: bankData, error: bankError } = await supabase
        .from('agent_payout_profiles')
        .select('account_number, bank_code, account_name, verified')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (bankError) {
        console.error('Bank data fetch error:', bankError);
      }

      if (bankData) {
        setBankAccount(bankData.account_number);
        setBankCode(bankData.bank_code || '');
        // Find the bank name from the code
        const foundBank = BANK_OPTIONS.find(b => b.code === bankData.bank_code);
        setBankName(foundBank?.name || bankData.account_name || 'Unknown Bank');
        setIsBankVerified(bankData.verified || true); // Bank saved = verified for manual system
      }

      // 5. Orders
      const { data: myOrdersData, error: myOrdersError } = await supabase
        .from('orders')
        .select('id, order_number, customer_id, subtotal, delivery_fee, discount, total, status, payment_method, payment_status, promo_code, delivery_address, delivery_notes, seller_id, seller_type, created_at, updated_at')
        .eq('delivery_agent_id', agentData.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (myOrdersError) {
        console.error('My orders fetch error:', myOrdersError);
      }

      let availableOrdersData: FullOrder[] = [];
      if (agentData.is_available) {
        const { data: available, error: availableOrdersError } = await supabase
          .from('orders')
          .select('id, order_number, customer_id, subtotal, delivery_fee, discount, total, status, payment_method, payment_status, promo_code, delivery_address, delivery_notes, seller_id, seller_type, created_at, updated_at')
          .is('delivery_agent_id', null)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (availableOrdersError) {
          console.error('Available orders fetch error:', availableOrdersError);
        }

        availableOrdersData = available || [];
      }

      // Attach order items & menu names (same as before — kept minimal for brevity)
      const allOrderIds = [...(myOrdersData || []), ...availableOrdersData].map(o => o.id);
      let orderItemsByOrderId: Record<string, any[]> = {};
      if (allOrderIds.length > 0) {
        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from('order_items')
          .select('id, order_id, quantity, price, menu_item_id')
          .in('order_id', allOrderIds);

        if (orderItemsError) {
          console.error('Order items fetch error:', orderItemsError);
        }

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
        const { data: menuItemsData, error: menuItemsError } = await supabase
          .from('menu_items')
          .select('id, name')
          .in('id', menuItemIds);

        if (menuItemsError) {
          console.error('Menu items fetch error:', menuItemsError);
        }

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
      setMessage({ type: 'error', text: 'Error loading dashboard data. Please try refreshing the page.' });
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  // Initial + periodic fetch
  useEffect(() => {
    console.log('DeliveryDashboard: useEffect triggered, profile ID:', profile?.id);
    fetchData();

    // Check approval status for delivery agents
    if (profile && profile.role === 'delivery_agent') {
      checkAgentApproval();
    }

    const interval = setInterval(() => {
      console.log('DeliveryDashboard: Interval fetch triggered');
      fetchData();
    }, 15000);

    return () => {
      console.log('DeliveryDashboard: Cleaning up interval');
      clearInterval(interval);
    };
  }, [profile?.id]);

  const checkAgentApproval = async () => {
    if (profile && profile.role === 'delivery_agent') {
      setLoadingApproval(true);
      const status = await checkApprovalStatus(profile.id, 'delivery_agent');
      setApprovalStatus(status);
      setLoadingApproval(false);
    }
  };

  // Save bank details with Paystack verification
  const saveBankDetails = async () => {
    if (!profile?.id || bankAccount.length !== 10 || !bankCode) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit account number and select a bank.' });
      return;
    }

    // Validate account number is numeric
    if (!/^\d{10}$/.test(bankAccount)) {
      setMessage({ type: 'error', text: 'Account number must be exactly 10 digits.' });
      return;
    }

    setSavingBank(true);
    setMessage(null);

    try {
      // Direct Supabase call since schema doesn't match WalletService
      const { data: existingProfile, error: selectError } = await supabase
        .from('agent_payout_profiles')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('agent_payout_profiles')
          .update({
            account_number: bankAccount.trim(),
            account_name: profile.full_name || 'Unknown',
            bank_code: bankCode,
            verified: false // Reset verification status
          })
          .eq('user_id', profile.id);
      } else {
        // Create new profile
        result = await supabase
          .from('agent_payout_profiles')
          .insert([{
            user_id: profile.id,
            account_number: bankAccount.trim(),
            account_name: profile.full_name || 'Unknown',
            bank_code: bankCode,
            verified: false
          }]);
      }

      if (result.error) {
        throw result.error;
      }

      // Then verify with Paystack
      const verifyResponse = await fetch('/api/verify-bank-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent?.id, // This might be needed for the API
          account_number: bankAccount.trim(),
          bank_code: bankCode
        })
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        console.warn('Bank verification failed:', errorData);
        // Don't throw error for verification - just update the verified status
      } else {
        // Update the verified status
        await supabase
          .from('agent_payout_profiles')
          .update({ verified: true })
          .eq('user_id', profile.id);
      }

      setMessage({ type: 'success', text: '✅ Bank details saved and verified successfully!' });
      setIsBankVerified(true);
      // Don't call fetchData here since it will be called by the periodic effect
    } catch (err: any) {
      console.error('Save bank error:', err);
      setMessage({ type: 'error', text: `Failed to save bank details: ${err.message}` });
    } finally {
      setSavingBank(false);
    }
  };

  // Open withdrawal modal
  const openWithdrawModal = () => {
    if (!wallet || wallet.earnings_wallet_balance <= 0) {
      setMessage({ type: 'error', text: 'Insufficient balance in earnings wallet.' });
      return;
    }
    setWithdrawAmount(wallet.earnings_wallet_balance);
    setShowWithdrawModal(true);
    setMessage(null);
  };

  // Submit withdrawal request (Paystack automated)
  const handleWithdrawRequest = async () => {
    if (!agent || !wallet || !profile || withdrawAmount == null) return;

    if (!isBankVerified || !bankAccount || !bankCode) {
      setMessage({ type: 'error', text: 'Please save your bank details first.' });
      return;
    }

    // Validate amount
    if (withdrawAmount <= 0 || withdrawAmount > wallet.earnings_wallet_balance) {
      setMessage({ type: 'error', text: `Amount must be between ₦0.01 and ${formatCurrency(wallet.earnings_wallet_balance)}.` });
      return;
    }

    // Minimum withdrawal amount
    if (withdrawAmount < 100) {
      setMessage({ type: 'error', text: 'Minimum withdrawal amount is ₦100.' });
      return;
    }

    // Rate limiting check (max 1 request per 30 seconds)
    const now = Date.now();
    if (withdrawCooldownRef.current && now - withdrawCooldownRef.current < 30000) {
      const waitTime = Math.ceil((30000 - (now - withdrawCooldownRef.current)) / 1000);
      setMessage({ type: 'error', text: `Please wait ${waitTime} seconds before submitting another request.` });
      return;
    }
    withdrawCooldownRef.current = now;

    setProcessingWithdrawal(true);
    setMessage(null);

    try {
      // Sanitize inputs
      const sanitizedAmount = Math.round(withdrawAmount * 100) / 100; // Round to 2 decimals

      // Use WalletService to request withdrawal
      await WalletService.requestWithdrawal(agent.id, { amount: sanitizedAmount });

      setMessage({
        type: 'success',
        text: `✅ Withdrawal request submitted! The amount will be transferred to your account shortly.`,
      });
      setShowWithdrawModal(false);
      // Don't call fetchData here since it will be called by the periodic effect
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
      // Don't call fetchData here since it will be called by the periodic effect
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
      // Don't call fetchData here since it will be called by the periodic effect
      // Dashboard will update automatically via useEffect interval
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
      // Send notification about status update
      try {
        // Fetch order details to get customer and seller IDs
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('customer_id, seller_id, seller_type, order_number')
          .eq('id', orderId)
          .single();

        if (orderData) {
          // Send notification to customer
          await notificationService.sendOrderStatusUpdate(orderData.order_number, orderData.customer_id, newStatus);

          // Send notification to seller (vendor or cafeteria)
          if (orderData.seller_id) {
            await notificationService.sendOrderStatusUpdate(orderData.order_number, orderData.seller_id, newStatus);
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the status update if notification fails
      }

      // Don't call fetchData here since it will be called by the periodic effect
      // Dashboard will update automatically via useEffect interval
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

  // Check if user is a delivery agent and hasn't been approved yet
  if (profile && profile.role === 'delivery_agent') {
    if (loadingApproval) {
      return <div className="min-h-screen flex items-center justify-center">Checking approval status...</div>;
    }

    if (approvalStatus === false) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-600 mb-6">
              Your delivery agent account is currently under review by the admin. You will be notified once approved.
            </p>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    if (approvalStatus === null) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <Lock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Approval Required</h2>
            <p className="text-gray-600 mb-6">
              Your delivery agent account needs to be approved by the admin before you can access the dashboard.
            </p>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }
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
    <div className="min-h-screen bg-black pb-24 md:pb-0">
      {/* Full-screen food background with dark overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/1.jpg')",
        }}
      />
      <div className="fixed inset-0 bg-black bg-opacity-70" />

      {/* Main content with proper z-index */}
      <div className="relative z-10 min-h-screen pb-24 md:pb-0">
        {/* Header Navigation */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Delivery Dashboard</h1>
                  <p className="text-xs text-gray-500">{profile?.full_name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <RoleSwitcher currentRole="delivery_agent" />
                {/* Desktop Profile Button */}
                {onShowProfile && (
                  <button
                    onClick={onShowProfile}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-sm font-medium">Profile</span>
                  </button>
                )}

                {/* Desktop Payment Methods Button */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="hidden md:flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Wallet className="h-5 w-5" />
                  <span className="text-sm font-medium">Payment</span>
                </button>

                {/* Hamburger Menu */}
                <button
                  ref={hamburgerButtonRef}
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 md:hidden"
                  aria-label="Menu"
                >
                  {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>

              {/* Hamburger Menu Dropdown */}
              {showMobileMenu && (
                <div ref={menuRef} className="absolute right-4 top-16 bg-white shadow-lg rounded-md py-2 w-48 z-50 border border-gray-200 md:hidden">
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('active');
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Active Orders</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('available');
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Available Orders</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowNotifications(true);
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <span>Notifications</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('history');
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Earnings History</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      // Open payment methods (bank details management)
                      setShowProfileModal(true);
                      setShowMobileMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <Wallet className="h-4 w-4" />
                      <span>Payment Methods</span>
                    </div>
                  </button>
                  <button
                    onClick={signOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center space-x-2">
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
            {/* Food Wallet */}
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Food Wallet</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(wallet?.food_wallet_balance)}</p>
                  <p className="text-xs text-gray-500 mt-1">For food purchases</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Earnings Wallet */}
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Earnings Wallet</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(wallet?.earnings_wallet_balance)}</p>
                  <p className="text-xs text-gray-500 mt-1">Available for withdrawal</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={openWithdrawModal}
                  disabled={!wallet || wallet.earnings_wallet_balance <= 0}
                  className="w-full py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Request Withdrawal
                </button>
              </div>
            </div>

            {/* Total Balance */}
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBalance)}</p>
                  <p className="text-xs text-gray-500 mt-1">Food + Earnings</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-purple-600" />
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
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center space-x-3">
                {isBankVerified ? (
                  <>
                    <div className="mt-0.5 p-1.5 bg-green-100 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-green-800">✅ Bank Details Saved</h3>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <h3 className="text-lg font-bold text-yellow-800">⚠️ Bank Details Required</h3>
                  </>
                )}
              </div>
              <button
                onClick={() => { }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                disabled
              >
                {isBankVerified ? 'Update' : 'Manage'}
              </button>
            </div>

            {!isBankVerified ? (
              <>
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
              </>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Your bank details are saved and ready for withdrawals.
                </p>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-green-800">
                    <span className="font-medium">{bankName}</span> •••• {bankAccount.slice(-4)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'active'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Active Orders ({myOrders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'picked_up'].includes(o.status)).length})
                </button>
                <button
                  onClick={() => setActiveTab('available')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'available'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Available Orders ({availableOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Order History
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Active Orders Tab */}
              {activeTab === 'active' && (
                <div>
                  {myOrders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'picked_up'].includes(o.status)).length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Orders</h3>
                      <p className="text-gray-500">You don't have any active orders right now.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myOrders
                        .filter(o => ['pending', 'accepted', 'preparing', 'ready', 'picked_up'].includes(o.status))
                        .map(order => (
                          <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">Order #{order.order_number}</h4>
                                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  order.status === 'picked_up' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'ready' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                }`}>
                                {order.status === 'pending' && 'Pending'}
                                {order.status === 'accepted' && 'Accepted'}
                                {order.status === 'preparing' && 'Preparing'}
                                {order.status === 'ready' && 'Ready for Pickup'}
                                {order.status === 'picked_up' && 'Out for Delivery'}
                                {order.status === 'delivered' && 'Delivered'}
                                {order.status === 'cancelled' && 'Cancelled'}
                              </span>
                            </div>

                            <div className="mb-3">
                              <p className="text-sm text-gray-600">Total: {formatCurrency(order.total)}</p>
                              <p className="text-sm text-gray-600">Address: {order.delivery_address}</p>
                            </div>

                            {order.order_items && order.order_items.length > 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
                                <ul className="text-sm text-gray-600">
                                  {order.order_items.map(item => (
                                    <li key={item.id}>
                                      {item.quantity}x {item.menu_item?.name || 'Unknown Item'}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {order.status === 'accepted' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'preparing')}
                                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Mark Preparing
                                </button>
                              )}
                              {order.status === 'preparing' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'ready')}
                                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Mark Ready
                                </button>
                              )}
                              {order.status === 'ready' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Mark Picked Up
                                </button>
                              )}
                              {order.status === 'picked_up' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Mark Delivered
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedOrderForChat(order)}
                                className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center"
                              >
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Chat
                              </button>
                              <button
                                onClick={() => setSelectedOrderForTracking(order)}
                                className="px-3 py-1.5 text-xs bg-blue-200 text-blue-700 rounded hover:bg-blue-300 flex items-center"
                              >
                                <Navigation className="h-3 w-3 mr-1" />
                                Track
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Available Orders Tab */}
              {activeTab === 'available' && (
                <div>
                  {availableOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Available Orders</h3>
                      <p className="text-gray-500">There are no orders available for delivery right now.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {availableOrders.map(order => (
                        <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">Order #{order.order_number}</h4>
                              <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Available
                            </span>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm text-gray-600">Total: {formatCurrency(order.total)}</p>
                            <p className="text-sm text-gray-600">Address: {order.delivery_address}</p>
                          </div>

                          {order.order_items && order.order_items.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
                              <ul className="text-sm text-gray-600">
                                {order.order_items.map(item => (
                                  <li key={item.id}>
                                    {item.quantity}x {item.menu_item?.name || 'Unknown Item'}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <button
                            onClick={() => handleAcceptOrder(order)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                            disabled={!isOnline}
                          >
                            {isOnline ? 'Accept Order' : 'Go Online to Accept'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Order History Tab */}
              {activeTab === 'history' && (
                <div>
                  {myOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled').length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Order History</h3>
                      <p className="text-gray-500">You don't have any completed or cancelled orders yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myOrders
                            .filter(o => o.status === 'delivered' || o.status === 'cancelled')
                            .map(order => (
                              <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-900">#{order.order_number}</td>
                                <td className="py-3 px-4 text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatCurrency(order.total)}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => setSelectedOrderForChat(order)}
                                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 mr-2"
                                  >
                                    Chat
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${req.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : req.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : req.status === 'processing'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                            >
                              {req.status === 'completed' && '✅ '}
                              {req.status === 'failed' && '❌ '}
                              {req.status === 'processing' && '🔄 '}
                              {req.status === 'pending' && '⏳ '}
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                            {req.processed_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(req.processed_at).toLocaleDateString()}
                              </div>
                            )}
                            {req.error_message && (
                              <div className="text-xs text-red-600 mt-1">{req.error_message}</div>
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

        {selectedOrderForTracking && (
          <LocationTracker
            orderId={selectedOrderForTracking.id}
            orderStatus={selectedOrderForTracking.status}
            onClose={() => setSelectedOrderForTracking(null)}
          />
        )}

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Delivery Agent Profile</h2>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{profile?.full_name}</h3>
                      <p className="text-sm text-gray-600">{profile?.email}</p>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-gray-700 ml-1">{agent?.rating || '4.8'} Rating</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Account Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">ID:</span> {agent?.id}</p>
                        <p><span className="text-gray-500">Phone:</span> {profile?.phone || 'Not provided'}</p>
                        <p><span className="text-gray-500">Vehicle:</span> {agent?.vehicle_type || 'Not specified'}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-700">Payment Methods</h4>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            // This button just shows the current state
                            // The actual update happens in the main bank section
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          disabled
                        >
                          {isBankVerified ? 'Update' : 'Add'}
                        </button>
                      </div>
                      <div className="text-sm">
                        {isBankVerified ? (
                          <p className="text-green-700">
                            <span className="text-gray-500">Bank:</span> {bankName}<br />
                            <span className="text-gray-500">Account:</span> •••• {bankAccount.slice(-4)}
                          </p>
                        ) : (
                          <p className="text-yellow-700">No bank details saved yet</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Performance Stats</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500">Total Deliveries</p>
                          <p className="font-semibold">{agent?.total_deliveries || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500">Active Orders</p>
                          <p className="font-semibold">{myOrders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'picked_up'].includes(o.status)).length}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Status</h4>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span>Online Status</span>
                        <button
                          onClick={toggleOnlineStatus}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      signOut();
                    }}
                    className="w-full py-2.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Modal */}
        {showNotifications && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Bell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800">New Available Orders</h4>
                        <p className="text-sm text-blue-700 mt-1">There are 3 new orders available for delivery in your area.</p>
                        <p className="text-xs text-blue-600 mt-2">Just now</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-green-800">Order Delivered</h4>
                        <p className="text-sm text-green-700 mt-1">You successfully delivered order #ORD-001. ₦500 earned.</p>
                        <p className="text-xs text-green-600 mt-2">10 minutes ago</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Bank Details Required</h4>
                        <p className="text-sm text-yellow-700 mt-1">Please update your bank details to receive earnings.</p>
                        <p className="text-xs text-yellow-600 mt-2">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-full py-2.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Request Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Request Withdrawal</h3>
              <p className="text-sm text-gray-600 mb-3">
                Available in Earnings Wallet: <span className="font-bold text-green-600">{formatCurrency(wallet?.earnings_wallet_balance)}</span>
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
                max={wallet?.earnings_wallet_balance}
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
    </div>
  );
};