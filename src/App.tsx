// src/App.tsx - Hash-based Routing Implementation for Role Switching
import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { CustomerHome } from './components/customer/CustomerHome';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import { VendorBottomNavigation } from './components/vendor/VendorBottomNavigation';
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
  // Add state to track location changes
  const [locationHash, setLocationHash] = useState(window.location.hash);

  // Force re-evaluation of routing when auth state changes
  useEffect(() => {
    if (user && profile) {
      setLocationHash(window.location.hash || '');
    }
  }, [user, profile]);

  // Check for hash-based routing when component mounts and when location changes
  useEffect(() => {
    const handleHashChange = () => {
      setLocationHash(window.location.hash);
      if (user && profile) {
        if (locationHash === '#/vendor') {
          // Check if user has vendor role
          if ((profile as Profile).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role)) {
            return; // Allow vendor view
          } else {
            // If not a vendor, show customer view but keep hash for clarity
            console.log('User does not have vendor access');
            return;
          }
        } else if (locationHash === '#/delivery') {
          // Check if user has delivery_agent role
          if ((profile as Profile).is_delivery_agent || profile.role === 'delivery_agent') {
            return; // Allow delivery agent view
          } else {
            // If not a delivery agent, show customer view but keep hash for clarity
            console.log('User does not have delivery agent access');
            return;
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

  // Handle empty hash for authenticated users - redirect to appropriate dashboard
  useEffect(() => {
    if (user && profile && !loading) {
      // If we're on an empty hash or landing page, redirect to appropriate dashboard
      if (!locationHash || locationHash === '#/' || locationHash === '') {
        // Clear hash to trigger role-based routing
        window.location.hash = '';
      }
    }
  }, [user, profile, loading, locationHash]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle auth callback route - redirect to dashboard after OAuth
  const isAuthCallback = locationHash.startsWith('#/auth/callback') ||
    window.location.search.includes('access_token') ||
    window.location.search.includes('type=oauth');

  if (isAuthCallback) {
    // Show AuthCallback component which will handle the redirect
    return <AuthCallback />;
  }

  // Handle hash-based routing
  if (user && profile) {

    // Handle bottom navigation routes
    if (locationHash === '#/cart') {
      return (
        <div className="authenticated-view">
          <Cart
            items={[]}
            onUpdateQuantity={() => { }}
            onClear={() => { }}
            onClose={() => { window.location.hash = ''; }}
            onCheckout={() => { }}
          />
          <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
        </div>
      );
    }

    if (locationHash === '#/notifications' || locationHash === '#/alerts') {
      // TODO: Implement notifications component
      return (
        <div className="authenticated-view">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Notifications</h2>
            <p className="text-gray-600">Notifications functionality coming soon...</p>
          </div>
          <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
        </div>
      );
    }

    if (locationHash === '#/profile') {
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
          <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
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
          <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
        </div>
      );
    }

    // Handle role-based routing with proper SPA navigation
    const userRole = profile.role as UserRole;

    // Check hash for explicit role routing
    if (locationHash === '#/vendor') {
      if ((profile as Profile).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role)) {
        return (
          <div className="authenticated-view">
            <VendorDashboard onShowProfile={() => setShowProfile(true)} />
            <VendorBottomNavigation />
          </div>
        );
      } else {
        // Redirect to customer view but don't clear hash - let user see they don't have access
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      }
    } else if (locationHash === '#/delivery') {
      if ((profile as Profile).is_delivery_agent || profile.role === 'delivery_agent') {
        return (
          <div className="authenticated-view">
            <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      } else {
        // Redirect to customer view but don't clear hash - let user see they don't have access
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} />
          </div>
        );
      }
    }

    // Default routing based on primary role when no hash is specified
    switch (userRole) {
      case 'admin':
        return (
          <div className="authenticated-view">
            <AdminDashboard onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      case 'delivery_agent':
        return (
          <div className="authenticated-view">
            <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      case 'cafeteria':
        return (
          <div className="authenticated-view">
            <CafeteriaDashboard profile={profile} onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      case 'vendor':
      case 'late_night_vendor':
        // For vendors, check if they want to see vendor dashboard via hash
        if (window.location.hash === '#/vendor-dashboard') {
          return (
            <div className="authenticated-view">
              <VendorDashboard onShowProfile={() => setShowProfile(true)} />
              <VendorBottomNavigation />
            </div>
          );
        }
        // Otherwise show customer view by default
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
          </div>
        );
      case 'customer':
      default:
        return (
          <div className="authenticated-view">
            <CustomerHome onShowProfile={() => setShowProfile(true)} />
            <BottomNavigation cartCount={0} notificationCount={0} userRole={profile?.role} />
          </div>
        );
    }
  }

  // Show sign in form if role is selected
  if (selectedRole) {
    if (authView === 'signup' && (selectedRole === 'customer' || selectedRole === 'vendor' || selectedRole === 'late_night_vendor' || selectedRole === 'delivery_agent')) {
      return (
        <SignUp
          role={selectedRole === 'late_night_vendor' ? 'late_night_vendor' : selectedRole as 'customer' | 'vendor' | 'delivery_agent'}
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
        role={selectedRole === 'late_night_vendor' ? 'vendor' : selectedRole as 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin'}
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
