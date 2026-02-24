import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, CheckCircle, AlertCircle, Truck, Store, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
    id: string;
    type: 'order' | 'delivery' | 'vendor_order' | 'admin' | 'promo' | 'system';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    metadata?: Record<string, any>;
}

interface NotificationsPanelProps {
    onClose: () => void;
}

export const EnhancedNotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (profile?.id) {
            loadNotifications();

            // Set up real-time subscription
            const subscription = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${profile.id}`
                    },
                    (payload) => {
                        setNotifications(prev => [payload.new as Notification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [profile?.id]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile!.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (!error) {
                setNotifications(prev =>
                    prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (!error) {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
                // Update unread count
                const notification = notifications.find(n => n.id === notificationId);
                if (notification && !notification.read) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', profile!.id)
                .eq('read', false);

            if (!error) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'order':
                return <Store className="h-5 w-5 text-blue-500" />;
            case 'delivery':
                return <Truck className="h-5 w-5 text-green-500" />;
            case 'vendor_order':
                return <User className="h-5 w-5 text-purple-500" />;
            case 'admin':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                        <span className="ml-3 text-gray-600">Loading notifications...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <Bell className="h-6 w-6 text-gray-700 mr-3" />
                        <div>
                            <h2 className="text-xl font-bold text-black">Notifications</h2>
                            {unreadCount > 0 && (
                                <p className="text-sm text-gray-500">{unreadCount} unread</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                            <p className="text-gray-500">You're all caught up!</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`bg-white rounded-xl p-4 border transition-all hover:shadow-md ${notification.read ? 'border-gray-100' : 'border-green-200 bg-green-50'
                                        }`}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                >
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 ml-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold text-gray-900 truncate">
                                                    {notification.title}
                                                </h4>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                        {formatTimeAgo(notification.created_at)}
                                                    </span>
                                                    {!notification.read && (
                                                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {notification.message}
                                            </p>
                                            {notification.metadata && (
                                                <div className="mt-2 text-xs text-gray-500">
                                                    <div className="flex items-center space-x-2">
                                                        <span>Order: {notification.metadata.order_number || 'N/A'}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">
                                                            Status: {notification.metadata.status || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteNotification(notification.id);
                                            }}
                                            className="p-1 hover:bg-gray-200 rounded-full ml-2 flex-shrink-0"
                                        >
                                            <X className="h-4 w-4 text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                    <div className="flex items-center justify-center text-xs text-gray-500">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>Notifications are automatically updated</span>
                    </div>
                </div>
            </div>
        </div>
    );
};