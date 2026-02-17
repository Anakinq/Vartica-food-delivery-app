// src/App.tsx - Hash-based Routing Implementation with Code Splitting
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext';

// Lazy load route components for better performance (code splitting)
const CustomerHome = lazy(() => import('./components/customer/CustomerHome').then(module => ({ default: module.CustomerHome })));
const VendorDashboard = lazy(() => import('./components/vendor/VendorDashboard').then(module => ({ default: module.VendorDashboard })));
import { VendorBottomNavigation } from './components/vendor/VendorBottomNavigation';
import { LandingPage } from './components/LandingPage';
const SignIn = lazy(() => import('./components/auth/SignIn').then(module => ({ default: module.SignIn })));
const SignUp = lazy(() => import('./components/auth/SignUp').then(module => ({ default: module.SignUp })));
import { ProfileDashboard } from './components/shared/ProfileDashboard';
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const DeliveryDashboard = lazy(() => import('./components/delivery/DeliveryDashboard').then(module => ({ default: module.DeliveryDashboard })));
import { Cart } from './components/customer/Cart';
import { Checkout } from './components/customer/Checkout';
const CafeteriaDashboard = lazy(() => import('./components/cafeteria/CafeteriaDashboard').then(module => ({ default: module.default })));
import AuthCallback from './components/auth/AuthCallback';

import { Analytics } from '@vercel/analytics/react';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { UserRole } from './types';
import { Profile } from './lib/supabase/types';
import { BottomNavigation } from './components/shared/BottomNavigation';
import NotificationsPanel from './components/shared/NotificationsPanel';
import { CartProvider, useCart } from './contexts/CartContext';

// Loading fallback for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Wrap lazy component with Suspense helper
const withSuspense = <P extends object>(Component: React.ComponentType<P>) => {
  return function SuspendedComponent(props: P) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component {...props} />
      </Suspense>
    );
  };
};

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const { items, cartCount, clearCart } = useCart();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');
  const [locationHash, setLocationHash] = useState(window.location.hash);

  // Track previous hash for profile navigation
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash;
      if (currentHash === '#/profile' && locationHash && locationHash !== '#/profile') {
        // Store the previous page before going to profile
        sessionStorage.setItem('previous_page', locationHash);
      }
      setLocationHash(currentHash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [locationHash]);

  // Get effective role - use preferred role from sessionStorage if set, otherwise use profile role
  const getEffectiveRole = () => {
    if (!profile) return null;
    const preferredRole = sessionStorage.getItem('preferredRole');
    if (preferredRole && ['customer', 'vendor', 'delivery_agent', 'admin', 'cafeteria', 'late_night_vendor'].includes(preferredRole)) {
      return preferredRole as UserRole;
    }
    return profile.role as UserRole;
  };

  // Force re-evaluation of routing when auth state changes
  useEffect(() => {
    if (user && profile) {
      setLocationHash(window.location.hash || '');
      // Don't auto-redirect based on preferredRole - let user choose their view
      // The RoleSwitcher component handles role switching
    }
  }, [user, profile]);

  // Check for hash-based routing when component mounts and when location changes
  useEffect(() => {
    const handleHashChange = () => {
      setLocationHash(window.location.hash);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, profile]);

  // Handle empty hash for authenticated users
  useEffect(() => {
    if (user && profile && !loading && !locationHash) {
      window.location.hash = '';
    }
  }, [user, profile, loading, locationHash]);

  if (loading) {
    return <PageLoader />;
  }

  // Handle auth callback route
  const isAuthCallback = locationHash.startsWith('#/auth/callback') ||
    window.location.search.includes('access_token') ||
    window.location.search.includes('type=oauth');

  if (isAuthCallback) {
    return <AuthCallback />;
  }

  // Handle hash-based routing
  if (user && profile) {
    // Handle checkout route
    if (locationHash === '#/checkout') {
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const deliveryFee = 500;

      return (
        <div className="authenticated-view">
          <div className="main-content cart-full-height">
            <Checkout
              items={items}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              packCount={0}
              onBack={() => { window.location.hash = ''; }}
              onClose={() => { window.location.hash = ''; }}
              onSuccess={() => {
                clearCart();
                window.location.hash = '';
              }}
            />
          </div>
          <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
        </div>
      );
    }

    // Handle notifications
    if (locationHash === '#/notifications' || locationHash === '#/alerts') {
      return (
        <div className="authenticated-view">
          <div className="main-content">
            <NotificationsPanel onClose={() => { window.location.hash = ''; }} />
          </div>
          <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
        </div>
      );
    }

    // Handle profile
    if (locationHash === '#/profile') {
      const isVendor = profile.role === 'vendor' || (profile as any).role === 'late_night_vendor';
      // Determine back navigation based on previous hash or role
      const getBackHash = () => {
        // If user is vendor, check if they came from vendor dashboard
        if (isVendor) {
          // Try to get previous page from sessionStorage
          const previousPage = sessionStorage.getItem('previous_page');
          if (previousPage?.startsWith('#/vendor')) {
            return previousPage;
          }
          return '#/vendor';
        }
        return '';
      };
      return (
        <div className="authenticated-view">
          <div className="main-content">
            <ProfileDashboard
              onBack={() => {
                sessionStorage.removeItem('previous_page');
                window.location.hash = getBackHash();
              }}
              onSignOut={() => signOut()}
              onClose={() => {
                sessionStorage.removeItem('previous_page');
                window.location.hash = getBackHash();
              }}
            />
          </div>
          {isVendor ? (
            <VendorBottomNavigation />
          ) : (
            <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
          )}
        </div>
      );
    }

    // Handle vendor orders route
    if (locationHash === '#/vendor-orders') {
      if ((profile as Profile).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role)) {
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(VendorDashboard)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <VendorBottomNavigation />
          </div>
        );
      }
      // Fallback to customer view if not a vendor
      window.location.hash = '#/customer';
      return null;
    }

    // Handle vendor earnings route
    if (locationHash === '#/vendor-earnings') {
      if ((profile as Profile).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role)) {
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(VendorDashboard)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <VendorBottomNavigation />
          </div>
        );
      }
      // Fallback to customer view if not a vendor
      window.location.hash = '#/customer';
      return null;
    }

    // Handle vendor dashboard routes
    if (locationHash.startsWith('#/vendor')) {
      // Store previous page before navigating to profile
      const handleProfileClick = () => {
        sessionStorage.setItem('previous_page', locationHash);
        setShowProfile(true);
      };

      if (locationHash === '#/vendor' || locationHash === '#/vendor-orders' || locationHash === '#/vendor-earnings') {
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(VendorDashboard)({ onShowProfile: handleProfileClick })}
            </div>
            <VendorBottomNavigation />
          </div>
        );
      }
    }

    // Handle customer route (for vendors who want to browse as customer)
    if (locationHash === '#/customer') {
      // Store previous page before navigating to profile
      const handleProfileClick = () => {
        sessionStorage.setItem('previous_page', locationHash);
        setShowProfile(true);
      };
      return (
        <div className="authenticated-view">
          <div className="main-content">
            {withSuspense(CustomerHome)({ onShowProfile: handleProfileClick })}
          </div>
          <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
        </div>
      );
    }

    // Handle role-based routing
    const effectiveRole = getEffectiveRole();
    const userRole = effectiveRole || (profile.role as UserRole);

    // Handle explicit customer route
    if (locationHash === '#/customer') {
      return (
        <div className="authenticated-view">
          <div className="main-content">
            {withSuspense(CustomerHome)({
              onShowProfile: () => {
                window.location.hash = '#/profile';
              }
            })}
          </div>
          <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
        </div>
      );
    }

    // Check hash for explicit role routing
    if (locationHash === '#/vendor') {
      if ((profile as Profile).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role)) {
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(VendorDashboard)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <VendorBottomNavigation />
          </div>
        );
      }
      return (
        <div className="authenticated-view">
          <div className="main-content">
            {withSuspense(CustomerHome)({ onShowProfile: () => setShowProfile(true) })}
          </div>
          <BottomNavigation cartCount={cartCount} notificationCount={0} />
        </div>
      );
    }

    if (locationHash === '#/delivery') {
      if ((profile as Profile).is_delivery_agent || profile.role === 'delivery_agent') {
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(DeliveryDashboard)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      }
      return (
        <div className="authenticated-view">
          <div className="main-content">
            {withSuspense(CustomerHome)({ onShowProfile: () => setShowProfile(true) })}
          </div>
          <BottomNavigation cartCount={cartCount} notificationCount={0} />
        </div>
      );
    }

    // Default routing based on primary role
    switch (userRole) {
      case 'admin':
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(AdminDashboard)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      case 'delivery_agent':
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(DeliveryDashboard)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      case 'cafeteria':
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(CafeteriaDashboard)({ profile, onShowProfile: () => setShowProfile(true) })}
            </div>
            <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      case 'vendor':
      case 'late_night_vendor':
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(VendorDashboard)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <VendorBottomNavigation />
          </div>
        );
      case 'customer':
      default:
        return (
          <div className="authenticated-view">
            <div className="main-content">
              {withSuspense(CustomerHome)({ onShowProfile: () => setShowProfile(true) })}
            </div>
            <BottomNavigation cartCount={cartCount} notificationCount={0} userRole={profile?.role} />
          </div>
        );
    }
  }

  // Show sign in form if role is selected
  if (selectedRole) {
    // For late_night_vendor, treat as 'vendor' in SignIn (same role handling)
    const signInRole = selectedRole === 'late_night_vendor' ? 'vendor' : selectedRole;
    // Only allow signup for supported roles
    const canSignUp = selectedRole === 'vendor' || selectedRole === 'delivery_agent';

    if (authView === 'signup' && canSignUp) {
      // Safely cast the role - late_night_vendor is already in the union type
      const signupRole = selectedRole as 'customer' | 'vendor' | 'delivery_agent' | 'late_night_vendor';
      return (
        <SignUp
          role={signupRole}
          onBack={() => { setSelectedRole(null); setAuthView('signin'); }}
          onSwitchToSignIn={() => setAuthView('signin')}
        />
      );
    }

    return (
      <SignIn
        role={signInRole as 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin'}
        onBack={() => setSelectedRole(null)}
        onSwitchToSignUp={
          canSignUp ? () => setAuthView('signup') : undefined
        }
      />
    );
  }

  // If no user and no role selected, show landing page
  return (
    <LandingPage
      onRoleSelect={(role, signup) => {
        setSelectedRole(role);
        setAuthView(signup ? 'signup' : 'signin');
      }}
    />
  );
}

function App() {
  useEffect(() => {
    // Filter out browser extension errors
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes('Extension context invalidated')) return;
      originalError.apply(console, args);
    };

    // Validate environment variables
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('Configuration error: Missing Supabase credentials. Check your .env file.');
    }
  }, []);

  return (
    <ErrorBoundary>
      <DarkModeProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <div className="app-container">
                <div role="status" aria-live="polite" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                  Loading application
                </div>
                <div role="alert" aria-live="assertive" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                </div>
                <AppContent />
                <Analytics />
              </div>
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  );
}

export default App;
