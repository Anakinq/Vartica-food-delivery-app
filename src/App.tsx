// src/App.tsx - Hash-based Routing Implementation for Role Switching
import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { CustomerHome } from './components/customer/CustomerHome';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import { LandingPage } from './components/LandingPage';
import { SignIn } from './components/auth/SignIn';
import { SignUp } from './components/auth/SignUp';
import { ProfileDashboard } from './components/shared/ProfileDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { DeliveryDashboard } from './components/delivery/DeliveryDashboard';
import { Cart } from './components/customer/Cart';
import CafeteriaDashboard from './components/cafeteria/CafeteriaDashboard';
import AuthCallback from './components/auth/AuthCallback';
import InstallPrompt from './components/InstallPrompt';
import { Analytics } from '@vercel/analytics/react';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { UserRole } from './types';
import { Profile } from './lib/supabase/types';
import { BottomNavigation } from './components/shared/BottomNavigation';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');

  // Check for hash-based routing when component mounts and when location changes
  useEffect(() => {
    const handleHashChange = () => {
      if (user && profile) {
        if (window.location.hash === '#/vendor') {
          // Check if user has vendor role
          if ((profile as Profile).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role)) {
            return; // Allow vendor view
          } else {
            // If not a vendor, redirect to customer view and clear hash
            window.location.hash = '';
          }
        } else if (window.location.hash === '#/delivery') {
          // Check if user has delivery_agent role
          if ((profile as Profile).is_delivery_agent || profile.role === 'delivery_agent') {
            return; // Allow delivery agent view
          } else {
            // If not a delivery agent, redirect to customer view and clear hash
            window.location.hash = '';
          }
        }
      }
    };

    // Initial check
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle hash-based routing
  if (user && profile) {
    // Check if we're on the auth callback route
    if (window.location.hash.startsWith('#/auth/callback')) {
      return <AuthCallback />;
    }

    // Handle bottom navigation routes
    if (window.location.hash === '#/cart') {
      return (
        <div className="authenticated-view">
          <Cart
            items={[]}
            onUpdateQuantity={() => { }}
            onClear={() => { }}
            onClose={() => { window.location.hash = ''; }}
            onCheckout={() => { }}
          />
          <BottomNavigation cartCount={0} notificationCount={0} />
        </div>
      );
    }

    if (window.location.hash === '#/notifications' || window.location.hash === '#/alerts') {
      // TODO: Implement notifications component
      return (
        <div className="authenticated-view">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Notifications</h2>
            <p className="text-gray-600">Notifications functionality coming soon...</p>
          </div>
          <BottomNavigation cartCount={0} notificationCount={0} />
        </div>
      );
    }

    if (window.location.hash === '#/profile') {
      return (
        <div className="authenticated-view">
          <ProfileDashboard
            onBack={() => {
              window.location.hash = '';
            }}
            onSignOut={() => {
              // Handle sign out
            }}
          />
          <BottomNavigation cartCount={0} notificationCount={0} />
        </div>
      );
    }

    // Show profile dashboard if requested
    console.log('App: showProfile=', showProfile, 'user=', !!user, 'profile=', !!profile);
    if (showProfile) {
      return (
        <div className="authenticated-view">
          <ProfileDashboard
            onBack={() => setShowProfile(false)}
            onSignOut={() => {
              setShowProfile(false);
            }}
          />
          <BottomNavigation cartCount={0} notificationCount={0} />
        </div>
      );
    }

    if (window.location.hash === '#/vendor') {
      if ((profile as Profile).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role)) {
        return (
          <div className="authenticated-view">
            <VendorDashboard onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      } else {
        window.location.hash = '';
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      }
    } else if (window.location.hash === '#/delivery') {
      if ((profile as Profile).is_delivery_agent || profile.role === 'delivery_agent') {
        return (
          <div className="authenticated-view">
            <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      } else {
        window.location.hash = '';
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      }
    }

    // Default routing based on primary role
    const userRole = profile.role as UserRole;
    switch (userRole) {
      case 'admin':
        return (
          <div className="authenticated-view">
            <AdminDashboard onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      case 'delivery_agent':
        return (
          <div className="authenticated-view">
            <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      case 'cafeteria':
        return (
          <div className="authenticated-view">
            <CafeteriaDashboard profile={profile} onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      case 'vendor':
      case 'late_night_vendor':
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      case 'customer':
      default:
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
    }
  }

  // Check if we're on the auth callback route when not logged in
  if (window.location.hash.startsWith('#/auth/callback')) {
    return <AuthCallback />;
  }



  // Show sign in form if role is selected
  if (selectedRole) {
    if (authView === 'signup' && (selectedRole === 'vendor' || selectedRole === 'late_night_vendor' || selectedRole === 'delivery_agent')) {
      return (
        <SignUp
          role={selectedRole === 'late_night_vendor' ? 'late_night_vendor' : selectedRole}
          onBack={() => {
            setSelectedRole(null);
            setAuthView('signin');
          }}
          onSwitchToSignIn={() => setAuthView('signin')}
        />
      );
    }

    return (
      <SignIn
        role={selectedRole === 'late_night_vendor' ? 'vendor' : selectedRole}
        onBack={() => setSelectedRole(null)}
        onSwitchToSignUp={
          selectedRole === 'vendor' || selectedRole === 'late_night_vendor' || selectedRole === 'delivery_agent'
            ? () => setAuthView('signup')
            : undefined
        }
      />
    );
  }

  // If no user and no role selected, show landing page
  return (
    <LandingPage
      onRoleSelect={(role) => {
        setSelectedRole(role);
        setAuthView('signin');
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

    // Validate environment variables (silent check)
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('Configuration error: Missing Supabase credentials. Check your .env file.');
    }
  }, []);

  return (
    <ErrorBoundary>
      <DarkModeProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="app-container">
              {/* Accessibility elements */}
              <div role="status" aria-live="polite" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                Loading application
              </div>
              <div role="alert" aria-live="assertive" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                {/* For error messages */}
              </div>
              <AppContent />
              <InstallPrompt />
              <Analytics />
            </div>
          </ToastProvider>
        </AuthProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  );
}

export default App;
