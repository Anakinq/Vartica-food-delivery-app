// src/components/vendor/VendorBottomNavigation.tsx
import React from 'react';
import { Home, Package, BarChart3, User } from 'lucide-react';

interface VendorBottomNavigationProps {
    cartCount?: number;
    notificationCount?: number;
    userRole?: string;
}

export const VendorBottomNavigation: React.FC<VendorBottomNavigationProps> = ({
    cartCount = 0,
    notificationCount = 0,
}) => {
    const navItems = [
        { icon: Home, label: 'Home', href: '#/vendor', active: true },
        { icon: Package, label: 'Orders', href: '#/vendor-orders', active: false },
        { icon: BarChart3, label: 'Earnings', href: '#/vendor-earnings', active: false },
        { icon: User, label: 'Profile', href: '#/profile', active: false },
    ];

    return (
        <nav className="bottom-nav-connected safe-area-bottom bg-gray-900 border-t border-gray-800">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map((item, idx) => (
                    <a
                        key={idx}
                        href={item.href}
                        className={`flex flex-col items-center justify-center flex-1 h-full ${item.active ? 'text-purple-600' : 'text-gray-500'
                            }`}
                    >
                        <div className="relative">
                            <item.icon className="h-6 w-6" />
                            {item.label === 'Orders' && cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                            {item.label === 'Profile' && notificationCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </span>
                            )}
                        </div>
                        <span className="text-xs mt-1">{item.label}</span>
                    </a>
                ))}
            </div>
        </nav>
    );
};

export default VendorBottomNavigation;
