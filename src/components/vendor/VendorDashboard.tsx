// src/components/vendor/VendorDashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  LogOut, Package, MessageCircle, Wallet, Settings, Menu, X,
  CheckCircle, Clock, DollarSign, Star, Phone, ChevronRight, BarChart3
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
  customer?: { full_name: string; phone?: string };
}

interface VendorStats {
  totalOrders: number;
  totalRevenue: number;
  avgRating: number;
  reviewCount: number;
}

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
      // Fetch vendor record
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
      }

      // Fetch orders
      await fetchOrders(vendorData?.id);

      // Fetch stats
      if (vendorData?.id) {
        await fetchStats(vendorData.id);
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      showToast({ type: 'error', message: 'Failed to load vendor data' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (vendorId: string | undefined) => {
    if (!vendorId) return;

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:user_id (full_name, phone)
        `)
        .eq('seller_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      // Fetch order items
      const orderIds = ordersData?.map(o => o.id) || [];
      let orderItemsByOrderId: Record<string, any[]> = {};

      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, order_id, quantity, price, menu_item_id')
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-2xl font-bold text-gray-900">
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
                <p className="text-2xl font-bold text-gray-900">{stats.reviewCount}</p>
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
                  onReject={() => handleRejectOrder(order)}
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
    </div>
  );
};

// Order Card Components
const OrderCard: React.FC<{
  order: FullOrder;
  onAccept: () => void;
  onReject: () => void;
  onChat: () => void;
}> = ({ order, onAccept, onReject, onChat }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
        <p className="text-sm text-gray-600">
          {order.customer?.full_name} • {new Date(order.created_at || '').toLocaleString()}
        </p>
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
          onClick={onReject}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium"
        >
          Reject
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
    <div className="flex justify-between items-start">
      <div>
        <h3 className="font-bold text-gray-900">{order.order_number}</h3>
        <p className="text-sm text-gray-600">
          {order.customer?.full_name} • {new Date(order.created_at || '').toLocaleString()}
        </p>
      </div>
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(order.status)}`}>
        {order.status}
      </span>
    </div>
    <p className="font-bold text-lg mt-2">Total: ₦{order.total.toFixed(2)}</p>
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
