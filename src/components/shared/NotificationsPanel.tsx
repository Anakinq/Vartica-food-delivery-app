import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle, AlertCircle, ShoppingBag, Bike, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase/client';

interface Notification {
    id: string;
    type: 'order' | 'delivery' | 'promo' | 'system';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    metadata?: Record<string, any>;
}

interface NotificationsPanelProps {
    onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            // For now, generate mock notifications based on user role
            // In production, this would query a notifications table
            const mockNotifications: Notification[] = [
                {
                    id: '1',
                    type: 'order',
                    title: 'New Order Received',
                    message: 'You have received a new order for Jollof Rice',
                    read: false,
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    type: 'delivery',
                    title: 'Delivery Update',
                    message: 'Your order is on its way',
                    read: false,
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                    id: '3',
                    type: 'promo',
                    title: 'Special Offer',
                    message: 'Get 20% off on all orders today!',
                    read: true,
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                },
            ];
            setNotifications(mockNotifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'order':
                return <ShoppingBag className="h-5 w-5 text-blue-500" />;
            case 'delivery':
                return <Bike className="h-5 w-5 text-green-500" />;
            case 'promo':
                return <Store className="h-5 w-5 text-orange-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
            <div className="min-h-screen flex items-end sm:items-center justify-center p-4">
                <div className="bg-white w-full sm:max-w-md sm:rounded-2xl max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <Bell className="h-6 w-6 text-gray-700" />
                            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="flex space-x-2 p-4 border-b border-gray-100">
                        <button
                            onClick={() => setFilter('all')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${filter === 'all'
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${filter === 'unread'
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="text-center py-8">
                                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 rounded-xl transition-colors cursor-pointer ${notification.read
                                                ? 'bg-gray-50 hover:bg-gray-100'
                                                : 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500'
                                            }`}
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className={`font-semibold ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-gray-500">
                                                        {formatTimeAgo(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded"
                                            >
                                                <X className="h-4 w-4 text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default NotificationsPanel;
