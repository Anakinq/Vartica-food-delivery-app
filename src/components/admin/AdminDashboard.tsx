import React, { useEffect, useState } from 'react';
import { LogOut, Users, Store, Bike, Package, Wallet, Menu, X, Search, Filter, Download, BarChart3, Settings, User, CreditCard, AlertTriangle, UserCheck, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Profile, Order } from '../../lib/supabase';
import { AdminApprovalDashboard } from './AdminApprovalDashboard';
import { DeliveryFeePromoCodesManager } from './DeliveryFeePromoCodesManager';
import AdminSkeleton from './AdminSkeleton';
import Pagination from '../common/Pagination';

interface AdminDashboardProps {
  onShowProfile?: () => void;
}

interface WithdrawalRecord {
  id: string;
  agent_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  processed_at?: string;
  error_message?: string;
  paystack_transfer_code?: string;
  paystack_transfer_reference?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onShowProfile }) => {
  const { profile, signOut, user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalAgents: 0,
    totalOrders: 0,
    pendingOrders: 0,
    pendingWithdrawals: 0,
  });
  const [users, setUsers] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRecord[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'withdrawals' | 'approvals' | 'support' | 'promo-codes'>('withdrawals');
  const [loading, setLoading] = useState(true);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [supportPage, setSupportPage] = useState(1);
  const [pageSize] = useState(10); // Default page size

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [usersRes, vendorsRes, agentsRes, ordersRes, withdrawalsRes, supportRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('*'),
      supabase.from('delivery_agents').select('*'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
      supabase.from('support_messages').select('*').order('created_at', { ascending: false }),
    ]);

    if (usersRes.data) {
      setUsers(usersRes.data);
      setStats(prev => ({ ...prev, totalUsers: usersRes.data.length }));
    }

    if (vendorsRes.data) {
      setStats(prev => ({ ...prev, totalVendors: vendorsRes.data.length }));
    }

    if (agentsRes.data) {
      setStats(prev => ({ ...prev, totalAgents: agentsRes.data.length }));
    }

    if (ordersRes.data) {
      setOrders(ordersRes.data);
      setStats(prev => ({
        ...prev,
        totalOrders: ordersRes.data.length,
        pendingOrders: ordersRes.data.filter(o => o.status === 'pending').length,
      }));
    }

    if (withdrawalsRes.data) {
      setWithdrawalRequests(withdrawalsRes.data);
      setStats(prev => ({
        ...prev,
        pendingWithdrawals: withdrawalsRes.data.filter(w => w.status === 'pending').length,
      }));
    }

    if (supportRes.data) {
      setSupportMessages(supportRes.data);
    }

    setLoading(false);
  };

  // Function to filter data based on search term and date range
  const filterData = () => {
    // Filter users
    const filteredUsers = users.filter(user => {
      const matchesSearch = searchTerm === '' ||
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // Filter orders
    const filteredOrders = orders.filter(order => {
      const matchesSearch = searchTerm === '' ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.payment_status.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = dateRange.start && dateRange.end ?
        new Date(order.created_at) >= new Date(dateRange.start) &&
        new Date(order.created_at) <= new Date(dateRange.end) :
        true;

      return matchesSearch && matchesDate;
    });

    // Filter withdrawal records
    const filteredWithdrawals = withdrawalRequests.filter(request => {
      const matchesSearch = searchTerm === '' ||
        request.agent_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.status.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = dateRange.start && dateRange.end ?
        new Date(request.created_at) >= new Date(dateRange.start) &&
        new Date(request.created_at) <= new Date(dateRange.end) :
        true;

      return matchesSearch && matchesDate;
    });

    // Filter support messages
    const filteredSupportMessages = supportMessages.filter(message => {
      const matchesSearch = searchTerm === '' ||
        message.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.message.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = dateRange.start && dateRange.end ?
        new Date(message.created_at) >= new Date(dateRange.start) &&
        new Date(message.created_at) <= new Date(dateRange.end) :
        true;

      return matchesSearch && matchesDate;
    });

    return {
      filteredUsers,
      filteredOrders,
      filteredWithdrawals,
      filteredSupportMessages,
      // Paginated versions
      paginatedUsers: filteredUsers.slice((usersPage - 1) * pageSize, usersPage * pageSize),
      paginatedOrders: filteredOrders.slice((ordersPage - 1) * pageSize, ordersPage * pageSize),
      paginatedWithdrawals: filteredWithdrawals.slice((withdrawalsPage - 1) * pageSize, withdrawalsPage * pageSize),
      paginatedSupportMessages: filteredSupportMessages.slice((supportPage - 1) * pageSize, supportPage * pageSize),
    };
  };

  // Function to export data
  const exportData = (type: 'users' | 'orders' | 'withdrawals' | 'support') => {
    const { filteredUsers, filteredOrders, filteredWithdrawals, filteredSupportMessages } = filterData();

    let data: any[];
    let headers: string[];

    switch (type) {
      case 'users':
        data = filteredUsers; // Export all filtered data, not just current page
        headers = ['Name', 'Email', 'Role', 'Joined'];
        break;
      case 'orders':
        data = filteredOrders;
        headers = ['Order #', 'Total', 'Status', 'Payment Method', 'Payment Status', 'Date'];
        break;
      case 'withdrawals':
        data = filteredWithdrawals;
        headers = ['Date', 'Agent ID', 'Amount', 'Status', 'Paystack Reference', 'Processed At'];
        break;
      case 'support':
        data = filteredSupportMessages;
        headers = ['User Name', 'User Email', 'Message', 'Created At', 'Is Resolved'];
        break;
      default:
        return;
    }

    // Convert data to CSV
    const csvContent = [
      headers.join(','),
      ...data.map(item => Object.values(item).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}_data_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Full-screen food background with dark overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/1.jpg')",
        }}
      />
      <div className="fixed inset-0 bg-black bg-opacity-70" />

      {/* Main content with proper z-index */}
      <div className="relative z-10 min-h-screen">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">{profile?.full_name}</p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Hamburger Menu */}
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>

            {/* Hamburger Menu Dropdown */}
            {showMenu && (
              <div className="absolute right-4 top-16 bg-white shadow-lg rounded-md py-2 w-48 z-50 border border-gray-200">
                <button
                  onClick={() => {
                    setActiveTab('users');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Users</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('approvals');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Approvals</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('orders');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Orders</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('withdrawals');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span>Withdrawals</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('support');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Support Messages</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('promo-codes');
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Delivery Fee Promo Codes</span>
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
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search and Filter Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search users, orders, withdrawals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Start date"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="End date"
              />
              <button
                onClick={() => {
                  setDateRange({ start: '', end: '' });
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
            <button
              onClick={() => exportData(activeTab as 'users' | 'orders' | 'withdrawals')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-5 w-5" />
              <span>Export</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{searchTerm ? filterData().filteredUsers.length : stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Store className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vendors</p>
                  <p className="text-2xl font-bold text-gray-900">{searchTerm ? filterData().filteredUsers.filter(u => u.role === 'vendor').length : stats.totalVendors}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Bike className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Agents</p>
                  <p className="text-2xl font-bold text-gray-900">{searchTerm ? filterData().filteredUsers.filter(u => u.role === 'delivery_agent').length : stats.totalAgents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Package className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{searchTerm ? filterData().filteredOrders.length : stats.totalOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-2 border-red-200">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Wallet className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Withdrawals</p>
                  <p className="text-2xl font-bold text-red-600">{searchTerm ? filterData().filteredWithdrawals.filter(w => w.status === 'pending').length : stats.pendingWithdrawals}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('withdrawals')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'withdrawals'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  💸 Withdrawals ({filterData().filteredWithdrawals.filter(w => w.status === 'pending').length} pending)
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Orders ({filterData().filteredOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Users ({filterData().filteredUsers.length})
                </button>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'approvals'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Approvals
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'support'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Support Messages
                </button>
                <button
                  onClick={() => setActiveTab('promo-codes')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'promo-codes'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Delivery Fee Promo Codes
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'approvals' && (
                <AdminApprovalDashboard />
              )}
              {activeTab === 'withdrawals' && (
                <div>
                  {filterData().filteredWithdrawals.length === 0 ? (
                    <p className="text-gray-600">No withdrawal records found.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Agent ID</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Paystack Reference</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Processed At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filterData().paginatedWithdrawals.map(req => (
                              <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {new Date(req.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{req.agent_id}</td>
                                <td className="py-3 px-4 text-sm font-bold text-green-600">
                                  ₦{Number(req.amount).toFixed(2)}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${req.status === 'completed'
                                      ? 'bg-green-100 text-green-700'
                                      : req.status === 'failed'
                                        ? 'bg-red-100 text-red-700'
                                        : req.status === 'processing'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-blue-100 text-blue-700'
                                      }`}
                                  >
                                    {req.status === 'completed' && '✅ '}
                                    {req.status === 'failed' && '❌ '}
                                    {req.status === 'processing' && '⏳ '}
                                    {req.status === 'pending' && '📅 '}
                                    {req.status.toUpperCase()}
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
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {req.paystack_transfer_reference || req.paystack_transfer_code || 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {req.processed_at ? new Date(req.processed_at).toLocaleString() : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <Pagination
                        currentPage={withdrawalsPage}
                        totalPages={Math.ceil(filterData().filteredWithdrawals.length / pageSize)}
                        onPageChange={setWithdrawalsPage}
                        pageSize={pageSize}
                        totalCount={filterData().filteredWithdrawals.length}
                      />
                    </>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterData().paginatedUsers.map(user => (
                          <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{user.full_name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={usersPage}
                    totalPages={Math.ceil(filterData().filteredUsers.length / pageSize)}
                    onPageChange={setUsersPage}
                    pageSize={pageSize}
                    totalCount={filterData().filteredUsers.length}
                  />
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order #</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Payment Method</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Payment Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterData().paginatedOrders.map(order => (
                          <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.order_number}</td>
                            <td className="py-3 px-4 text-sm font-bold text-gray-900">₦{order.total.toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{order.payment_method}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                order.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                {order.payment_status === 'paid' && '✅ '}
                                {order.payment_status === 'failed' && '❌ '}
                                {order.payment_status || 'pending'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={ordersPage}
                    totalPages={Math.ceil(filterData().filteredOrders.length / pageSize)}
                    onPageChange={setOrdersPage}
                    pageSize={pageSize}
                    totalCount={filterData().filteredOrders.length}
                  />
                </div>
              )}

              {activeTab === 'support' && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User Name</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User Email</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Message</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterData().paginatedSupportMessages.map(message => (
                          <tr key={message.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{message.user_name}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{message.user_email}</td>
                            <td className="py-3 px-4 text-sm text-gray-700 max-w-xs truncate" title={message.message}>{message.message}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(message.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${message.is_resolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {message.is_resolved ? 'Resolved' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={supportPage}
                    totalPages={Math.ceil(filterData().filteredSupportMessages.length / pageSize)}
                    onPageChange={setSupportPage}
                    pageSize={pageSize}
                    totalCount={filterData().filteredSupportMessages.length}
                  />
                </div>
              )}

              {activeTab === 'promo-codes' && (
                <DeliveryFeePromoCodesManager />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
