import React, { useState } from 'react';
import { Home, ShoppingCart, User, Bell, Package, MapPin } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';

interface BottomNavigationProps {
    cartCount?: number;
    notificationCount?: number;
    userRole?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
    cartCount = 0,
    notificationCount = 0,
    userRole = 'customer'
}) => {
    // Use React state for active tab
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return hash || '';
    });

    // Simple hash-based navigation function
    const navigateTo = (path: string) => {
        setActiveTab(path);
        window.location.hash = path;
    };

    // Handle cart click - dispatch event to open cart modal
    const handleCartClick = () => {
        setActiveTab('cart');
        // Dispatch custom event that CustomerHome can listen for
        window.dispatchEvent(new CustomEvent('open-cart-modal'));
    };

    // Determine active state based on React state
    const isActive = (path: string) => {
        if (path === '' || path === '/') {
            return activeTab === '' || activeTab === '/';
        }
        return activeTab === path;
    };

    const navItems = userRole === 'delivery_agent' ? [
        {
            id: 'home',
            label: 'Dashboard',
            icon: Home,
            path: '',
            onClick: () => navigateTo(''),
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: Package,
            path: '/orders',
            onClick: () => navigateTo('/orders'),
        },
        {
            id: 'location',
            label: 'Track',
            icon: MapPin,
            path: '/location',
            onClick: () => navigateTo('/location'),
        },
        {
            id: 'profile',
            label: 'Profile',
            icon: User,
            path: '/profile',
            onClick: () => navigateTo('/profile'),
        },
    ] : [
        {
            id: 'home',
            label: 'Home',
            icon: Home,
            path: '',
            onClick: () => navigateTo(''),
        },
        {
            id: 'cart',
            label: 'Cart',
            icon: ShoppingCart,
            path: '/cart',
            onClick: handleCartClick,
        },
        {
            id: 'notifications',
            label: 'Alerts',
            icon: Bell,
            path: '/notifications',
            onClick: () => navigateTo('/notifications'),
        },
        {
            id: 'profile',
            label: 'Profile',
            icon: User,
            path: '/profile',
            onClick: () => navigateTo('/profile'),
        },
    ];

    return (
        <div className="relative">
            <nav className="bottom-nav bg-gray-900 border-t border-gray-800">
                {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.id}
                            onClick={item.onClick}
                            className={`nav-item ${active ? 'active' : ''}`}
                            aria-label={item.label}
                            aria-current={active ? 'page' : undefined}
                        >
                            <div className="nav-icon">
                                <IconComponent size={24} />
                                {item.id === 'cart' && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {cartCount > 99 ? '99+' : cartCount}
                                    </span>
                                )}
                                {item.id === 'notifications' && notificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                        {notificationCount > 99 ? '99+' : notificationCount}
                                    </span>
                                )}
                            </div>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </nav>
            {/* Role Switcher - show for users who have multiple roles */}
            <div className="absolute -top-10 right-2">
                <RoleSwitcher currentRole={userRole as any} variant="compact" />
            </div>
        </div>
    );
};

