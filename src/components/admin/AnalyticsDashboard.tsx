import React, { useEffect, useState } from 'react';
import {
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Store, Bike, Package, Wallet, DollarSign, ShoppingCart, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OrderAnalytics, UserAnalytics, VendorAnalytics, FinancialAnalytics, WithdrawalAnalytics, DeliveryAnalytics } from '../../types';

interface AnalyticsDashboardProps {
    dateRange?: { start: string; end: string };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ dateRange }) => {
    const [loading, setLoading] = useState(true);
    const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics | null>(null);
    const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
    const [vendorAnalytics, setVendorAnalytics] = useState<VendorAnalytics | null>(null);
    const [financialAnalytics, setFinancialAnalytics] = useState<FinancialAnalytics | null>(null);
    const [withdrawalAnalytics, setWithdrawalAnalytics] = useState<WithdrawalAnalytics | null>(null);
    const [deliveryAnalytics, setDeliveryAnalytics] = useState<DeliveryAnalytics | null>(null);
    const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('30days');

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange, dateRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // If custom date range is provided, use it
            const effectiveStartDate = dateRange?.start ? new Date(dateRange.start) : startDate;
            const effectiveEndDate = dateRange?.end ? new Date(dateRange.end) : new Date();

            // Fetch orders
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .gte('created_at', effectiveStartDate.toISOString())
                .lte('created_at', effectiveEndDate.toISOString());

            // Fetch all orders for status breakdown (without date filter for complete picture)
            const { data: allOrders } = await supabase
                .from('orders')
                .select('*');

            // Fetch users
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .gte('created_at', effectiveStartDate.toISOString());

            const { data: allProfiles } = await supabase
                .from('profiles')
                .select('*');

            // Fetch vendors
            const { data: vendors } = await supabase
                .from('vendors')
                .select('*');

            // Fetch delivery agents
            const { data: agents } = await supabase
                .from('delivery_agents')
                .select('*');

            // Fetch withdrawals
            const { data: withdrawals } = await supabase
                .from('withdrawals')
                .select('*')
                .gte('created_at', effectiveStartDate.toISOString())
                .lte('created_at', effectiveEndDate.toISOString());

            // Process Order Analytics
            if (orders || allOrders) {
                const orderData = allOrders || orders || [];
                const pendingCount = orderData.filter((o: any) => o.status === 'pending').length;
                const completedCount = orderData.filter((o: any) => o.status === 'delivered' || o.status === 'completed').length;
                const cancelledCount = orderData.filter((o: any) => o.status === 'cancelled').length;
                const processingCount = orderData.length - pendingCount - completedCount - cancelledCount;

                const orderStatusData = [
                    { name: 'Pending', value: pendingCount, color: '#FFBB28' },
                    { name: 'Processing', value: processingCount, color: '#0088FE' },
                    { name: 'Completed', value: completedCount, color: '#00C49F' },
                    { name: 'Cancelled', value: cancelledCount, color: '#FF8042' },
                ].filter(item => item.value > 0);

                const paymentMethodData: { [key: string]: number } = {};
                orderData.forEach((o: any) => {
                    const method = o.payment_method || 'Unknown';
                    paymentMethodData[method] = (paymentMethodData[method] || 0) + 1;
                });

                const paymentMethods = Object.entries(paymentMethodData).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value,
                    color: COLORS[Object.keys(paymentMethodData).indexOf(name) % COLORS.length]
                }));

                // Daily orders
                const dailyOrdersMap: { [key: string]: { count: number; revenue: number } } = {};
                orderData.forEach((o: any) => {
                    const date = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!dailyOrdersMap[date]) {
                        dailyOrdersMap[date] = { count: 0, revenue: 0 };
                    }
                    dailyOrdersMap[date].count++;
                    dailyOrdersMap[date].revenue += Number(o.total) || 0;
                });

                const dailyOrders = Object.entries(dailyOrdersMap)
                    .map(([date, data]) => ({ date, ...data }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-14); // Show last 14 data points

                const totalRevenue = orderData.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
                const avgOrderValue = orderData.length > 0 ? totalRevenue / orderData.length : 0;

                setOrderAnalytics({
                    totalOrders: orderData.length,
                    pendingOrders: pendingCount,
                    completedOrders: completedCount,
                    cancelledOrders: cancelledCount,
                    ordersByStatus: orderStatusData,
                    ordersByPaymentMethod: paymentMethods,
                    dailyOrders,
                    averageOrderValue: avgOrderValue
                });

                // Financial Analytics
                const revenueByPayment: { [key: string]: number } = {};
                orderData.forEach((o: any) => {
                    const method = o.payment_method || 'Unknown';
                    revenueByPayment[method] = (revenueByPayment[method] || 0) + (Number(o.total) || 0);
                });

                const revenuePaymentMethods = Object.entries(revenueByPayment).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value,
                    color: COLORS[Object.entries(revenueByPayment).indexOf([name, value]) % COLORS.length]
                }));

                const dailyRevenueMap: { [key: string]: number } = {};
                orderData.forEach((o: any) => {
                    const date = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    dailyRevenueMap[date] = (dailyRevenueMap[date] || 0) + (Number(o.total) || 0);
                });

                const dailyRevenue = Object.entries(dailyRevenueMap)
                    .map(([date, revenue]) => ({ date, revenue }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-14);

                // Calculate actual platform earnings from platform_commission field
                const platformEarnings = orderData.reduce((sum: number, o: any) => sum + (Number(o.platform_commission) || 0), 0);

                setFinancialAnalytics({
                    totalRevenue,
                    revenueByPaymentMethod: revenuePaymentMethods,
                    dailyRevenue,
                    platformEarnings
                });
            }

            // Process User Analytics
            if (allProfiles || profiles) {
                const profileData = allProfiles || profiles || [];

                const roleData: { [key: string]: number } = {};
                profileData.forEach((p: any) => {
                    const role = p.role || 'customer';
                    roleData[role] = (roleData[role] || 0) + 1;
                });

                const usersByRole = Object.entries(roleData).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
                    value,
                    color: COLORS[Object.keys(roleData).indexOf(name) % COLORS.length]
                }));

                // Daily new users
                const dailyUsersMap: { [key: string]: number } = {};
                profileData.forEach((p: any) => {
                    const date = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    dailyUsersMap[date] = (dailyUsersMap[date] || 0) + 1;
                });

                const dailyNewUsers = Object.entries(dailyUsersMap)
                    .map(([date, count]) => ({ date, count }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-14);

                // Count active users (users with orders in last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const activeUserIds = new Set();
                if (orders) {
                    orders.forEach((o: any) => {
                        if (new Date(o.created_at) >= thirtyDaysAgo) {
                            activeUserIds.add(o.user_id);
                        }
                    });
                }

                setUserAnalytics({
                    totalUsers: profileData.length,
                    usersByRole,
                    dailyNewUsers,
                    activeUsers: activeUserIds.size
                });
            }

            // Process Vendor Analytics
            if (vendors) {
                const activeVendorCount = vendors.filter((v: any) => v.is_active).length;

                const categoryData: { [key: string]: number } = {};
                vendors.forEach((v: any) => {
                    const category = v.category || 'Other';
                    categoryData[category] = (categoryData[category] || 0) + 1;
                });

                const vendorsByCategory = Object.entries(categoryData).map(([name, value]) => ({
                    name,
                    value,
                    color: COLORS[Object.keys(categoryData).indexOf(name) % COLORS.length]
                }));

                // Calculate vendor revenue from all orders (not filtered by date)
                const vendorRevenue: { [key: string]: { revenue: number; orders: number } } = {};
                const allOrderData = allOrders || [];
                allOrderData.forEach((o: any) => {
                    const vendorId = o.seller_id;
                    if (vendorId) {
                        if (!vendorRevenue[vendorId]) {
                            vendorRevenue[vendorId] = { revenue: 0, orders: 0 };
                        }
                        vendorRevenue[vendorId].revenue += Number(o.total) || 0;
                        vendorRevenue[vendorId].orders++;
                    }
                });

                const vendorNames: { [key: string]: string } = {};
                vendors.forEach((v: any) => {
                    vendorNames[v.id] = v.name || v.business_name || 'Unknown';
                });

                const topVendorsByRevenue = Object.entries(vendorRevenue)
                    .map(([id, data]) => ({
                        name: vendorNames[id] || id.slice(0, 8),
                        revenue: data.revenue,
                        orders: data.orders
                    }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10);

                setVendorAnalytics({
                    totalVendors: vendors.length,
                    activeVendors: activeVendorCount,
                    vendorsByCategory,
                    topVendorsByRevenue
                });
            }

            // Process Delivery Analytics
            if (agents) {
                const activeAgentCount = agents.filter((a: any) => a.is_available || a.status === 'active').length;

                const statusData: { [key: string]: number } = {};
                agents.forEach((a: any) => {
                    const status = a.is_available ? 'Online' : a.status || 'Offline';
                    statusData[status] = (statusData[status] || 0) + 1;
                });

                const agentsByStatus = Object.entries(statusData).map(([name, value]) => ({
                    name,
                    value,
                    color: name === 'Online' ? '#00C49F' : '#FF8042'
                }));

                setDeliveryAnalytics({
                    totalAgents: agents.length,
                    activeAgents: activeAgentCount,
                    agentsByStatus,
                    topAgentsByDeliveries: [],
                    averageDeliveryTime: 0
                });
            }

            // Process Withdrawal Analytics
            if (withdrawals) {
                const pendingAmount = withdrawals
                    .filter((w: any) => w.status === 'pending' || w.status === 'pending_approval')
                    .reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0);

                const statusData: { [key: string]: number } = {};
                withdrawals.forEach((w: any) => {
                    const status = w.status || 'unknown';
                    statusData[status] = (statusData[status] || 0) + 1;
                });

                const withdrawalsByStatus = Object.entries(statusData).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
                    value,
                    color: name === 'completed' ? '#00C49F' : name === 'pending' || name === 'pending_approval' ? '#FFBB28' : '#FF8042'
                }));

                const typeData: { [key: string]: number } = {};
                withdrawals.forEach((w: any) => {
                    const type = w.type || w.withdrawal_type || 'Other';
                    typeData[type] = (typeData[type] || 0) + 1;
                });

                const withdrawalsByType = Object.entries(typeData).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
                    value,
                    color: COLORS[Object.keys(typeData).indexOf(name) % COLORS.length]
                }));

                // Daily withdrawals
                const dailyWithdrawalsMap: { [key: string]: number } = {};
                withdrawals.forEach((w: any) => {
                    const date = new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    dailyWithdrawalsMap[date] = (dailyWithdrawalsMap[date] || 0) + (Number(w.amount) || 0);
                });

                const dailyWithdrawals = Object.entries(dailyWithdrawalsMap)
                    .map(([date, amount]) => ({ date, amount }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .slice(-14);

                setWithdrawalAnalytics({
                    totalWithdrawals: withdrawals.length,
                    withdrawalsByStatus,
                    withdrawalsByType,
                    dailyWithdrawals,
                    pendingAmount
                });
            }

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
                <div className="flex gap-2">
                    {(['7days', '30days', '90days'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === range
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Total Revenue</p>
                            <p className="text-2xl font-bold">₦{financialAnalytics?.totalRevenue.toLocaleString() || 0}</p>
                        </div>
                        <DollarSign className="h-10 w-10 text-blue-200" />
                    </div>
                    <p className="text-blue-100 text-xs mt-2">Platform earnings: ₦{financialAnalytics?.platformEarnings.toLocaleString() || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Total Orders</p>
                            <p className="text-2xl font-bold">{orderAnalytics?.totalOrders || 0}</p>
                        </div>
                        <ShoppingCart className="h-10 w-10 text-green-200" />
                    </div>
                    <p className="text-green-100 text-xs mt-2">Avg: ₦{orderAnalytics?.averageOrderValue?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Total Users</p>
                            <p className="text-2xl font-bold">{userAnalytics?.totalUsers || 0}</p>
                        </div>
                        <Users className="h-10 w-10 text-purple-200" />
                    </div>
                    <p className="text-purple-100 text-xs mt-2">Active: {userAnalytics?.activeUsers || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm">Pending Withdrawals</p>
                            <p className="text-2xl font-bold">₦{withdrawalAnalytics?.pendingAmount.toLocaleString() || 0}</p>
                        </div>
                        <Wallet className="h-10 w-10 text-orange-200" />
                    </div>
                    <p className="text-orange-100 text-xs mt-2">{withdrawalAnalytics?.withdrawalsByStatus.find(w => w.name === 'Pending')?.value || 0} pending requests</p>
                </div>
            </div>

            {/* Row 1: Revenue & Orders Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                        Revenue Trend
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialAnalytics?.dailyRevenue || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₦${value / 1000}k`} />
                                <Tooltip
                                    formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10B981"
                                    fill="url(#colorRevenue)"
                                    strokeWidth={2}
                                />
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders Trend */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-blue-600" />
                        Orders & Revenue Daily
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={orderAnalytics?.dailyOrders || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(value) => `₦${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="count" name="Orders" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Pie Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Status Pie */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-purple-600" />
                        Orders by Status
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={orderAnalytics?.ordersByStatus || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {(orderAnalytics?.ordersByStatus || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Users by Role */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-600" />
                        Users by Role
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={userAnalytics?.usersByRole || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {(userAnalytics?.usersByRole || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                        Payment Methods
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={financialAnalytics?.revenueByPaymentMethod || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {(financialAnalytics?.revenueByPaymentMethod || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 3: Bar Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Users className="h-5 w-5 mr-2 text-purple-600" />
                        User Growth
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userAnalytics?.dailyNewUsers || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" name="New Users" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Vendors */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Store className="h-5 w-5 mr-2 text-green-600" />
                        Top Vendors by Revenue
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={vendorAnalytics?.topVendorsByRevenue || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `₦${value / 1000}k`} />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="revenue" name="Revenue" fill="#10B981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 4: Withdrawals & Delivery */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Withdrawal Status */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Wallet className="h-5 w-5 mr-2 text-orange-600" />
                        Withdrawals by Status
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={withdrawalAnalytics?.withdrawalsByStatus || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {(withdrawalAnalytics?.withdrawalsByStatus || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Delivery Agents Status */}
                <div className="bg-white rounded-xl shadow-md p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Bike className="h-5 w-5 mr-2 text-blue-600" />
                        Delivery Agents Status
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deliveryAnalytics?.agentsByStatus || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {(deliveryAnalytics?.agentsByStatus || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                    <Store className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{vendorAnalytics?.totalVendors || 0}</p>
                    <p className="text-sm text-gray-600">Total Vendors</p>
                    <p className="text-xs text-green-600">{vendorAnalytics?.activeVendors || 0} active</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                    <Bike className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{deliveryAnalytics?.totalAgents || 0}</p>
                    <p className="text-sm text-gray-600">Delivery Agents</p>
                    <p className="text-xs text-green-600">{deliveryAnalytics?.activeAgents || 0} online</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                    <Package className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{orderAnalytics?.completedOrders || 0}</p>
                    <p className="text-sm text-gray-600">Completed Orders</p>
                    <p className="text-xs text-orange-600">{orderAnalytics?.cancelledOrders || 0} cancelled</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 text-center">
                    <Wallet className="h-8 w-8 mx-auto text-red-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{withdrawalAnalytics?.totalWithdrawals || 0}</p>
                    <p className="text-sm text-gray-600">Total Withdrawals</p>
                    <p className="text-xs text-gray-500">{withdrawalAnalytics?.withdrawalsByStatus.find(w => w.name === 'Completed')?.value || 0} completed</p>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
