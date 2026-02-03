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
import CafeteriaDashboard from './components/cafeteria/CafeteriaDashboard';
import { Analytics } from '@vercel/analytics/react';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { UserRole } from './types';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');

  // Check for hash-based routing when component mounts and when location changes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/vendor' && user && profile) {
        // Check if user is actually a vendor
        if (profile.role && ['vendor', 'late_night_vendor'].includes(profile.role)) {
          return; // Allow vendor view
        } else {
          // If not a vendor, redirect to customer view and clear hash
          window.location.hash = '';
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

  // Handle hash-based vendor route
  if (window.location.hash === '#/vendor' && user && profile) {
    // Check if user is actually a vendor
    if (profile.role && ['vendor', 'late_night_vendor'].includes(profile.role)) {
      return <VendorDashboard onShowProfile={() => setShowProfile(true)} />;
    } else {
      // If not a vendor, redirect to customer view and clear hash
      window.location.hash = '';
      // Re-render to show customer view
      return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
    }
  }

  // Show profile dashboard if requested
  if (showProfile && user && profile) {
    return (
      <ProfileDashboard
        onBack={() => setShowProfile(false)}
        onSignOut={() => {
          setShowProfile(false);
        }}
      />
    );
  }

  // If user is authenticated, show appropriate dashboard based on role
  if (user && profile) {
    const userRole = profile.role as UserRole;
    switch (userRole) {
      case 'admin':
        return <AdminDashboard onShowProfile={() => setShowProfile(true)} />;
      case 'delivery_agent':
        return <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />;
      case 'cafeteria':
        return <CafeteriaDashboard profile={profile} onShowProfile={() => setShowProfile(true)} />;
      case 'vendor':
      case 'late_night_vendor':
        // Default to customer view for vendors unless hash indicates vendor view
        return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
      case 'customer':
      default:
        return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
    }
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
            <Analytics />
          </div>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;