import React, { useState } from 'react';
import { Home, Package, User, ArrowLeftRight } from 'lucide-react';

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

    // Scroll to section function
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Handle role switch - switch to customer view
    const handleRoleSwitch = () => {
        // Store the preferred role in sessionStorage
        sessionStorage.setItem('preferredRole', 'customer');
        // Clear hash and reload to ensure proper state update
        window.location.hash = '';
        // Small delay to ensure sessionStorage is set before reload
        setTimeout(() => {
            window.location.reload();
        }, 50);
    };

    const navItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: Home,
            action: () => scrollToSection('dashboard'),
        },
        {
            id: 'orders',
            label: 'Orders',
            icon: Package,
            action: () => scrollToSection('orders-section'),
            badge: orderCount > 0 ? orderCount : undefined,
        },
        {
            id: 'items',
            label: 'Items',
            icon: User,
            action: () => scrollToSection('menu-management'),
            badge: itemCount > 0 ? itemCount : undefined,
        },
        {
            id: 'switch-role',
            label: 'Switch Role',
            icon: ArrowLeftRight,
            action: handleRoleSwitch,
        },
    ];

    return (
        <nav className="bottom-nav safe-area-bottom" id="vendor-bottom-nav">
            {navItems.map((item) => {
                const IconComponent = item.icon;
                const active = activeTab === item.id ||
                    (item.id === 'dashboard' && (activeTab === '' || activeTab === '/'));

                return (
                    <button
                        key={item.id}
                        onClick={item.action}
                        className={`nav-item ${active ? 'active' : ''}`}
                        aria-label={item.label}
                        id={item.id === 'switch-role' ? 'role-switcher-button' : undefined}
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
