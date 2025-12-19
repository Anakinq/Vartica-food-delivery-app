import React, { useEffect, useState } from 'react';
import { LogOut, Users, Store, Bike, Package, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Profile, Order } from '../../lib/supabase';

interface WithdrawalRequest {
  id: string;
  agent_id: string;
  rider_name: string;
  amount: number;
  bank_name: string;
  account_number: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  rejection_reason?: string;
}

export const AdminDashboard: React.FC = () => {
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
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'withdrawals'>('withdrawals');
  const [loading, setLoading] = useState(true);
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [usersRes, vendorsRes, agentsRes, ordersRes, withdrawalsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('*'),
      supabase.from('delivery_agents').select('*'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
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

    setLoading(false);
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    if (!user?.id) return;

    // Confirm action
    const confirmed = window.confirm(
      '⚠️ IMPORTANT: Have you manually sent the money to the rider\'s bank account?\n\nOnly click OK if payment is completed.'
    );
    if (!confirmed) return;

    setProcessingWithdrawal(withdrawalId);

    try {
      const { data, error } = await supabase.rpc('approve_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_admin_id: user.id,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      alert('✅ Withdrawal approved! Rider will see updated balance.');
      await fetchData(); // Refresh
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason || reason.trim().length === 0) {
      alert('Rejection reason is required.');
      return;
    }

    // Sanitize input
    const sanitizedReason = reason.trim().slice(0, 200);

    setProcessingWithdrawal(withdrawalId);

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: sanitizedReason,
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      alert('❌ Withdrawal rejected.');
      await fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalVendors}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalAgents}</p>
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
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
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
                <p className="text-2xl font-bold text-red-600">{stats.pendingWithdrawals}</p>
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
                💸 Withdrawals ({stats.pendingWithdrawals} pending)
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'orders'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
              >
                Users ({users.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'withdrawals' && (
              <div>
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Manual Withdrawal System:</strong> After approving, you must manually send the money to the rider's bank account via your banking app.
                  </p>
                </div>
                {withdrawalRequests.length === 0 ? (
                  <p className="text-gray-600">No withdrawal requests yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rider</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bank Details</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawalRequests.map(req => (
                          <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {new Date(req.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{req.rider_name}</td>
                            <td className="py-3 px-4 text-sm font-bold text-green-600">
                              ₦{Number(req.amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              <div><strong>{req.bank_name}</strong></div>
                              <div className="text-xs text-gray-500">{req.account_number}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${req.status === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : req.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                  }`}
                              >
                                {req.status === 'approved' && '✅ '}
                                {req.status === 'rejected' && '❌ '}
                                {req.status === 'pending' && '⏳ '}
                                {req.status.toUpperCase()}
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
                            <td className="py-3 px-4">
                              {req.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApproveWithdrawal(req.id)}
                                    disabled={processingWithdrawal === req.id}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {processingWithdrawal === req.id ? 'Processing...' : '✅ Approve'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectWithdrawal(req.id)}
                                    disabled={processingWithdrawal === req.id}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                                  >
                                    ❌ Reject
                                  </button>
                                </div>
                              )}
                              {req.status !== 'pending' && (
                                <span className="text-xs text-gray-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
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
                    {users.map(user => (
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
            )}

            {activeTab === 'orders' && (
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
                    {orders.map(order => (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
