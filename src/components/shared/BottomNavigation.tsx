import React, { useState, useTransition } from 'react';
import { Home, ShoppingCart, User, Bell, Package, MapPin, ChevronUp, ChevronDown, Wallet } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';

interface BottomNavigationProps {
    cartCount?: number;
    notificationCount?: number;
    userRole?: string;
    // Callback to parent for navigation - enables instant state-only navigation
    onNavigate?: (path: string) => void;
    // Callback when collapse state changes
    onCollapseChange?: (isCollapsed: boolean) => void;
    // Initial collapsed state (optional)
    defaultCollapsed?: boolean;
    // Callback for wallet click
    onWalletClick?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
    cartCount = 0,
    notificationCount = 0,
    userRole = 'customer',
    onNavigate,
    onCollapseChange,
    defaultCollapsed = false,
    onWalletClick
}) => {
    // Use React state for active tab
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return hash || '';
    });

    // Use useTransition for instant UI feedback during navigation
    const [isPending, startTransition] = useTransition();

    // Collapsed state for the navigation bar
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    // Toggle collapsed state
    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        if (onCollapseChange) {
            onCollapseChange(newState);
        }
    };

    // Optimistic navigation - update state immediately, don't wait for hash change
    const navigateTo = (path: string) => {
        // Start transition allows React to prioritize the UI update
        startTransition(() => {
            setActiveTab(path);

            // If parent provides onNavigate, use that for instant navigation
            // Otherwise fall back to hash-based navigation
            if (onNavigate) {
                onNavigate(path);
            } else {
                window.location.hash = path;
            }
        });
    };

    // Handle cart click - dispatch event to open cart modal
    const handleCartClick = () => {
        startTransition(() => {
            setActiveTab('cart');
            if (onNavigate) {
                onNavigate('cart');
            }
            // Dispatch custom event that CustomerHome can listen for
            window.dispatchEvent(new CustomEvent('open-cart-modal'));
        });
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
            id: 'orders',
            label: 'Orders',
            icon: Package,
            path: '/orders',
            onClick: () => navigateTo('/orders'),
        },
        {
            id: 'wallet',
            label: 'Wallet',
            icon: Wallet,
            path: '/wallet',
            onClick: (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (onWalletClick) {
                    onWalletClick();
                } else {
                    navigateTo('/wallet');
                }
            },
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
        <div className={`fixed bottom-0 left-0 right-0 z-50 pb-safe transition-transform duration-300 ${isCollapsed ? 'translate-y-[calc(100%-40px)]' : ''}`}>
            {/* Collapse toggle button - visible as a small bar */}
            <button
                onClick={toggleCollapse}
                className="w-full h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 transition-colors"
                aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
                {isCollapsed && (
                    <span className="absolute left-3 text-xs text-gray-400">Menu</span>
                )}
                <div className="w-12 h-1 bg-gray-600 rounded-full" />
                <ChevronUp
                    size={20}
                    className={`absolute right-2 text-gray-400 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                />
            </button>
            <nav className="bottom-nav bg-gray-900 border-t border-gray-800 pb-[env(safe-area-inset-bottom)] transition-opacity duration-200">
                {navItems.map((item) => {
                    const IconComponent = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.id}
                            onClick={item.onClick}
                            className={`nav-item ${active ? 'active' : ''} ${isPending ? 'opacity-70' : ''}`}
                            aria-label={item.label}
                            aria-current={active ? 'page' : undefined}
                            disabled={isPending}
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
        </div>
    );
};

