import React from 'react';
import { Home, Package, User, Settings, LayoutGrid } from 'lucide-react';

interface VendorBottomNavigationProps {
    orderCount?: number;
    itemCount?: number;
}

export const VendorBottomNavigation: React.FC<VendorBottomNavigationProps> = ({
    orderCount = 0,
    itemCount = 0
}) => {
    const [activeTab, setActiveTab] = React.useState(() => {
        const hash = window.location.hash.replace('#', '');
        return hash || '';
    });

    const navigateTo = (path: string) => {
        setActiveTab(path);
        window.location.hash = path;
    };

    const isActive = (path: string) => {
        if (path === '' || path === '/') {
            return activeTab === '' || activeTab === '/';
        }
        return activeTab === path;
    };

    const navItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            path: '',
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: Package,
            path: '/vendor-orders',
            badge: orderCount > 0 ? orderCount : undefined,
        },
        {
            id: 'items',
            label: 'Items',
            icon: LayoutGrid,
            path: '/vendor-items',
            badge: itemCount > 0 ? itemCount : undefined,
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            path: '/vendor-settings',
        },
    ];

    return (
        <nav className="bottom-nav safe-area-bottom">
            {navItems.map((item) => {
                const IconComponent = item.icon;
                const active = isActive(item.path);

                return (
                    <button
                        key={item.id}
                        onClick={() => navigateTo(item.path)}
                        className={`nav-item ${active ? 'active' : ''}`}
                        aria-label={item.label}
                    >
                        <div className="nav-icon relative">
                            <IconComponent size={24} />
                            {item.badge !== undefined && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </div>
                        <span className="nav-label">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};
