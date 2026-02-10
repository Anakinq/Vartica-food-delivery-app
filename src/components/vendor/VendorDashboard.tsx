// src/components/vendor/VendorDashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  LogOut, Package, MessageCircle, Wallet, Settings, Menu, X,
  CheckCircle, Clock, DollarSign, Star, Phone, ChevronRight, BarChart3,
  Building2, CreditCard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Order, Vendor, Profile } from '../../lib/supabase';
import { ChatModal } from '../shared/ChatModal';
import { VendorWalletService, VendorReviewService } from '../../services/supabase/vendor.service';
import { databaseService } from '../../services';
import { useToast } from '../../contexts/ToastContext';

interface VendorDashboardProps {
  onShowProfile?: () => void;
}

interface FullOrder extends Order {
  order_items?: Array<{
    id: string;
    quantity: number;
    price: number;
    menu_item_id: string;
    menu_item?: { name: string };
  }>;
  customer?: { full_name: string; phone?: string; hostel_location?: string };
}

interface VendorStats {
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
  reviewCount: number;
}

interface VendorPayoutProfile {
  id: string;
  vendor_id: string;
  account_number: string;
  bank_code: string;
  account_name: string;
  verified: boolean;
}

// Nigerian banks list
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
  { code: '232', name: 'Sterling Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '033', name: 'Union Bank of Nigeria' },
  { code: '032', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export const VendorDashboard: React.FC<VendorDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut } = useAuth();
  const { showToast } = useToast();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<FullOrder[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    totalOrders: 0,
    totalRevenue: 0,
    avgRating: 0,
    reviewCount: 0
  });
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  // Bank/payout profile state
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [isBankVerified, setIsBankVerified] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | null>(null);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

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

  // Initial data fetch
  useEffect(() => {
    if (profile) {
      fetchVendorData();
    }
  }, [profile]);

  const fetchVendorData = async () => {
    if (!profile) return;

    try {
      // Fetch vendor record first (needed for ID)
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (vendorData) {
        setVendor(vendorData);

        // Load store open status from localStorage
        const savedStatus = localStorage.getItem(`vendor-open-${vendorData.id}`);
        if (savedStatus !== null) {
          setIsStoreOpen(JSON.parse(savedStatus));
        }

        // Fetch all independent data in parallel for better performance
        await Promise.all([
          fetchPayoutProfile(vendorData.id),
          fetchWalletBalance(vendorData.id),
          fetchOrders(vendorData.id),
          fetchStats(vendorData.id)
        ]);
      } else {
        // Even without vendor record, try to fetch orders and stats
        await Promise.all([
          fetchOrders(undefined),
          profile ? fetchStats(profile.id) : Promise.resolve()
        ]);
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      showToast({ type: 'error', message: 'Failed to load vendor data' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch payout profile
  const fetchPayoutProfile = async (vendorId: string) => {
    try {
      const { data: payoutData, error } = await supabase
        .from('vendor_payout_profiles')
        .select('*')
        .eq('vendor_id', vendorId)
        .maybeSingle();

      if (payoutData && !error) {
        setBankAccount(payoutData.account_number);
        setBankCode(payoutData.bank_code || '');
        setBankName(payoutData.account_name || 'Unknown Bank');
        setIsBankVerified(payoutData.verified || true);
      }
    } catch (error) {
      console.error('Error fetching payout profile:', error);
    }
  };

  // Fetch wallet balance
  const fetchWalletBalance = async (vendorId: string) => {
    try {
      const wallet = await VendorWalletService.getVendorWallet(vendorId);
      if (wallet) {
        setWalletBalance(wallet.total_earnings - wallet.withdrawn_earnings);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  // Save bank details
  const saveBankDetails = async () => {
    if (!vendor || !profile) return;

    if (bankAccount.length !== 10 || !bankCode) {
      showToast({ type: 'error', message: 'Please enter a valid 10-digit account number and select a bank.' });
      return;
    }

    if (!/^\d{10}$/.test(bankAccount)) {
      showToast({ type: 'error', message: 'Account number must be exactly 10 digits.' });
      return;
    }

    setSavingBank(true);

    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('vendor_payout_profiles')
        .select('id')
        .eq('vendor_id', vendor.id)
        .maybeSingle();

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('vendor_payout_profiles')
          .update({
            account_number: bankAccount.trim(),
            account_name: profile.full_name || 'Unknown',
            bank_code: bankCode,
            verified: false
          })
          .eq('vendor_id', vendor.id);
      } else {
        // Create new profile
        result = await supabase
          .from('vendor_payout_profiles')
          .insert([{
            vendor_id: vendor.id,
            account_number: bankAccount.trim(),
            account_name: profile.full_name || 'Unknown',
            bank_code: bankCode,
            verified: false
          }]);
      }

      if (result.error) {
        throw result.error;
      }

      showToast({ type: 'success', message: 'Bank details saved successfully!' });
      setIsBankVerified(true);
      setShowBankModal(false);
    } catch (error: any) {
      console.error('Save bank error:', error);
      showToast({ type: 'error', message: `Failed to save bank details: ${error.message}` });
    } finally {
      setSavingBank(false);
    }
  };

  // Handle withdrawal
  const handleWithdrawal = async () => {
    if (!vendor || !withdrawAmount || withdrawAmount <= 0) return;

    if (withdrawAmount > walletBalance) {
      showToast({ type: 'error', message: 'Insufficient balance.' });
      return;
    }

    if (withdrawAmount < 100) {
      showToast({ type: 'error', message: 'Minimum withdrawal amount is ₦100.' });
      return;
    }

    if (!isBankVerified) {
      showToast({ type: 'error', message: 'Please set up your bank details first.' });
      return;
    }

    setProcessingWithdrawal(true);

    try {
      const response = await fetch('/api/vendor-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendor.id,
          amount: withdrawAmount
        })
      });

      const result = await response.json();

      if (result.success) {
        showToast({ type: 'success', message: 'Withdrawal request submitted! Funds will be transferred shortly.' });
        setShowWithdrawModal(false);
        setWithdrawAmount(null);
        fetchWalletBalance(vendor.id);
      } else {
        showToast({ type: 'error', message: result.message || 'Withdrawal failed.' });
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      showToast({ type: 'error', message: 'Failed to process withdrawal.' });
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const fetchOrders = async (vendorId: string | undefined) => {
    if (!vendorId) return;

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:user_id (full_name, phone, hostel_location)
        `)
        .eq('seller_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      // Fetch order items with menu item details
      const orderIds = ordersData?.map(o => o.id) || [];
      let orderItemsByOrderId: Record<string, any[]> = {};

      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, order_id, quantity, price, menu_item_id, menu_item:menu_items(name)')
          .in('order_id', orderIds);

        orderItemsByOrderId = (orderItems || []).reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push(item);
          return acc;
        }, {} as Record<string, any[]>);
      }

      // Attach items to orders
      const fullOrders: FullOrder[] = (ordersData || []).map(order => ({
        ...order,
        order_items: orderItemsByOrderId[order.id] || []
      }));

      setOrders(fullOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchStats = async (vendorId: string) => {
    try {
      const [earningsSummary, rating, count] = await Promise.all([
        VendorWalletService.getEarningsSummary(vendorId),
        VendorReviewService.getVendorAverageRating(vendorId),
        VendorReviewService.getVendorReviewCount(vendorId)
      ]);

      setStats({
        totalOrders: earningsSummary.totalOrders,
        totalRevenue: earningsSummary.totalRevenue,
        avgRating: rating,
        reviewCount: count
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAcceptOrder = async (order: FullOrder) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', order.id);

      if (error) {
        showToast({ type: 'error', message: 'Failed to accept order' });
        return;
      }

      showToast({ type: 'success', message: 'Order accepted!' });
      fetchOrders(vendor?.id);
    } catch (error) {
      console.error('Error accepting order:', error);
      showToast({ type: 'error', message: 'Failed to accept order' });
    }
  };

  const handleStartPreparing = async (order: FullOrder) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', order.id);

      if (error) {
        showToast({ type: 'error', message: 'Failed to update order' });
        return;
      }

      showToast({ type: 'success', message: 'Started preparing order' });
      fetchOrders(vendor?.id);
    } catch (error) {
      console.error('Error updating order:', error);
      showToast({ type: 'error', message: 'Failed to update order' });
    }
  };

  const handleMarkReady = async (order: FullOrder) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', order.id);

      if (error) {
        showToast({ type: 'error', message: 'Failed to mark order as ready' });
        return;
      }

      showToast({ type: 'success', message: 'Order marked as ready for pickup!' });
      fetchOrders(vendor?.id);
    } catch (error) {
      console.error('Error marking order ready:', error);
      showToast({ type: 'error', message: 'Failed to mark order as ready' });
    }
  };

  const handleRejectOrder = async (order: FullOrder) => {
    if (!window.confirm('Are you sure you want to reject this order?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (error) {
        showToast({ type: 'error', message: 'Failed to reject order' });
        return;
      }

      showToast({ type: 'success', message: 'Order rejected' });
      fetchOrders(vendor?.id);
    } catch (error) {
      console.error('Error rejecting order:', error);
      showToast({ type: 'error', message: 'Failed to reject order' });
    }
  };

  const toggleStoreOpen = () => {
    const newStatus = !isStoreOpen;
    setIsStoreOpen(newStatus);
    localStorage.setItem(`vendor-open-${vendor?.id}`, JSON.stringify(newStatus));
    showToast({
      type: 'success',
      message: newStatus ? 'Store is now open!' : 'Store is now closed'
    });
  };

  const formatCurrency = (n?: number) => `₦${(typeof n === 'number' ? n : 0).toFixed(2)}`;

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status));
  const completedOrders = orders.filter(o => ['ready', 'delivered', 'completed', 'cancelled'].includes(o.status));

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-blue-100 text-blue-700',
      preparing: 'bg-blue-100 text-blue-700',
      ready: 'bg-orange-100 text-orange-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">{vendor?.store_name || 'Vendor Dashboard'}</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Store Status Toggle */}
              <button
                onClick={toggleStoreOpen}
                className={`px-3 py-1 rounded-full text-sm font-medium ${isStoreOpen
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
                  }`}
              >
                {isStoreOpen ? '🟢 Open' : '🔴 Closed'}
              </button>

              {/* Hamburger Menu */}
              <button
                ref={hamburgerButtonRef}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div ref={menuRef} className="absolute right-4 top-16 bg-white shadow-lg rounded-md py-2 w-48 z-50 border border-gray-200">
              <button
                onClick={() => {
                  setShowBankModal(true);
                  setShowMobileMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>Bank Details</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowWithdrawModal(true);
                  setShowMobileMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Withdraw</span>
                </div>
              </button>
              <button
                onClick={() => {
                  onShowProfile?.();
                  setShowMobileMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
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
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <Package className="h-10 w-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Wallet</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(walletBalance)}</p>
              </div>
              <Wallet className="h-10 w-10 text-green-600" />
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={walletBalance < 100}
              className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Withdraw
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'N/A'}
                </p>
              </div>
              <Star className="h-10 w-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reviews</p>
                <p className="text-xl font-bold text-gray-900">{stats.reviewCount}</p>
              </div>
              <BarChart3 className="h-10 w-10 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              🕐 Pending ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'active'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              🔥 Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'completed'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              ✅ Completed ({completedOrders.length})
            </button>
          </nav>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {activeTab === 'pending' && (
            pendingOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No pending orders</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={() => handleAcceptOrder(order)}
                  onChat={() => setSelectedOrderForChat(order)}
                />
              ))
            )
          )}

          {activeTab === 'active' && (
            activeOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No active orders</p>
              </div>
            ) : (
              activeOrders.map(order => (
                <ActiveOrderCard
                  key={order.id}
                  order={order}
                  onStartPreparing={() => handleStartPreparing(order)}
                  onMarkReady={() => handleMarkReady(order)}
                  onChat={() => setSelectedOrderForChat(order)}
                />
              ))
            )
          )}

          {activeTab === 'completed' && (
            completedOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl">
                <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No completed orders</p>
              </div>
            ) : (
              completedOrders.slice(0, 10).map(order => (
                <CompletedOrderCard key={order.id} order={order} />
              ))
            )
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {selectedOrderForChat && (
        <ChatModal
          orderId={selectedOrderForChat.id}
          orderNumber={selectedOrderForChat.order_number}
          recipientName={selectedOrderForChat.customer?.full_name || 'Customer'}
          recipientId={selectedOrderForChat.user_id}
          onClose={() => setSelectedOrderForChat(null)}
        />
      )}

      {/* Bank Details Modal */}
      {showBankModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Bank Details</h2>
              <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <select
                  value={bankCode}
                  onChange={(e) => {
                    setBankCode(e.target.value);
                    const bank = BANK_OPTIONS.find(b => b.code === e.target.value);
                    setBankName(bank?.name || '');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Bank</option>
                  {BANK_OPTIONS.map(bank => (
                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit account number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {bankCode && bankAccount.length === 10 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Account Name:</p>
                  <p className="font-medium">{profile?.full_name || 'Loading...'}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBankModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBankDetails}
                  disabled={savingBank || bankAccount.length !== 10 || !bankCode}
                  className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingBank ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Withdraw Funds</h2>
              <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(walletBalance)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                <input
                  type="number"
                  value={withdrawAmount || ''}
                  onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2">
                {[100, 500, 1000, 2000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setWithdrawAmount(Math.min(amount, walletBalance))}
                    disabled={amount > walletBalance}
                    className="flex-1 py-2 px-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    ₦{amount}
                  </button>
                ))}
                <button
                  onClick={() => setWithdrawAmount(walletBalance)}
                  disabled={walletBalance <= 0}
                  className="flex-1 py-2 px-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 text-sm"
                >
                  Max
                </button>
              </div>

              {!isBankVerified && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">Please set up your bank details first.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawal}
                  disabled={processingWithdrawal || !withdrawAmount || withdrawAmount > walletBalance || withdrawAmount < 100 || !isBankVerified}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {processingWithdrawal ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Order Card Components
const OrderCard: React.FC<{
  order: FullOrder;
  onAccept: () => void;
  onChat: () => void;
}> = ({ order, onAccept, onChat }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
        <p className="text-sm text-gray-600">
          {order.customer?.full_name} • {new Date(order.created_at || '').toLocaleString()}
        </p>
        {order.customer?.hostel_location && (
          <p className="text-sm text-purple-600 font-medium">
            📍 {order.customer.hostel_location}
          </p>
        )}
      </div>
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(order.status)}`}>
        {order.status}
      </span>
    </div>

    <div className="mb-4">
      <p className="text-sm font-medium text-gray-700">Items:</p>
      {order.order_items?.map((item, idx) => (
        <p key={idx} className="text-sm text-gray-600">
          {item.quantity}x {item.menu_item?.name || 'Item'} - ₦{(item.price * item.quantity).toFixed(2)}
        </p>
      ))}
    </div>

    <div className="flex justify-between items-center pt-4 border-t">
      <p className="font-bold text-lg">Total: ₦{order.total.toFixed(2)}</p>
      <div className="flex gap-2">
        <button
          onClick={onChat}
          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        <button
          onClick={onAccept}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
);

const ActiveOrderCard: React.FC<{
  order: FullOrder;
  onStartPreparing: () => void;
  onMarkReady: () => void;
  onChat: () => void;
}> = ({ order, onStartPreparing, onMarkReady, onChat }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
        <p className="text-sm text-gray-600">
          {order.customer?.full_name} • {new Date(order.created_at || '').toLocaleString()}
        </p>
        {order.customer?.hostel_location && (
          <p className="text-sm text-purple-600 font-medium">
            📍 {order.customer.hostel_location}
          </p>
        )}
      </div>
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(order.status)}`}>
        {order.status}
      </span>
    </div>

    <div className="mb-4">
      <p className="text-sm font-medium text-gray-700">Items:</p>
      {order.order_items?.map((item, idx) => (
        <p key={idx} className="text-sm text-gray-600">
          {item.quantity}x {item.menu_item?.name || 'Item'}
        </p>
      ))}
    </div>

    <div className="flex justify-between items-center pt-4 border-t">
      <p className="font-bold text-lg">Total: ₦{order.total.toFixed(2)}</p>
      <div className="flex gap-2">
        <button
          onClick={onChat}
          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        {order.status === 'accepted' && (
          <button
            onClick={onStartPreparing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Start Preparing
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={onMarkReady}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
          >
            Mark Ready
          </button>
        )}
      </div>
    </div>
  </div>
);

const CompletedOrderCard: React.FC<{ order: FullOrder }> = ({ order }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <div className="flex justify-between items-start mb-3">
      <div>
        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
        <p className="text-sm text-gray-600">
          {order.customer?.full_name} • {new Date(order.created_at || '').toLocaleString()}
        </p>
        {order.customer?.hostel_location && (
          <p className="text-sm text-purple-600 font-medium">
            📍 {order.customer.hostel_location}
          </p>
        )}
      </div>
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(order.status)}`}>
        {order.status}
      </span>
    </div>

    <div className="mb-3">
      {order.order_items?.map((item, idx) => (
        <p key={idx} className="text-sm text-gray-600">
          {item.quantity}x {item.menu_item?.name || 'Item'} - ₦{(item.price * item.quantity).toFixed(2)}
        </p>
      ))}
    </div>

    <p className="font-bold text-lg">Total: ₦{order.total.toFixed(2)}</p>
  </div>
);

function getStatusBadge(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-orange-100 text-orange-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export default VendorDashboard;
