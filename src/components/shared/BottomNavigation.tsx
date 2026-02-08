import React from 'react';
import { Home, ShoppingCart, User, Bell } from 'lucide-react';

interface BottomNavigationProps {
  cartCount?: number;
  notificationCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  cartCount = 0, 
  notificationCount = 0 
}) => {
  // Simple hash-based navigation function
  const navigateTo = (path: string) => {
    window.location.hash = path;
  };

  // Determine active state based on current hash
  const isActive = (path: string) => {
    const currentHash = window.location.hash.replace('#', '');
    if (path === '/') {
      return currentHash === '' || currentHash === '/';
    }
    return currentHash.startsWith(path.replace('/', ''));
  };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      path: '/cart',
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: Bell,
      path: '/notifications',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
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
  );
};

