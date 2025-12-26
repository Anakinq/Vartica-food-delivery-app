// src/App.tsx (NO ROUTER + PAYMENT SUCCESS) — FIXED
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase/client';
import { LandingPage } from './components/LandingPage';
import { SignIn } from './components/auth/SignIn';
import { SignUp } from './components/auth/SignUp';
import { CustomerHome } from './components/customer/CustomerHome';
import { CafeteriaDashboard } from './components/cafeteria/CafeteriaDashboard';
import { DeliveryDashboard } from './components/delivery/DeliveryDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProfileDashboard } from './components/shared/ProfileDashboard';
import { PaymentSuccess } from './components/customer/PaymentSuccess';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import AuthCallback from './components/auth/AuthCallback';

type Role = 'customer' | 'cafeteria' | 'vendor' | 'late_night_vendor' | 'delivery_agent' | 'admin';
type AuthView = 'signin' | 'signup';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [authView, setAuthView] = useState<AuthView>('signin');
  const [showProfile, setShowProfile] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false); // Track if user just signed up

  // Check for stored OAuth role after redirect from OAuth flow
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const handleOAuthRedirect = () => {
      try {
        if (typeof window !== 'undefined') {
          // Use the same SafeStorage instance that Supabase uses
          const safeStorage = (supabase.auth as any)._client.storage;
          const oauthRole = safeStorage.getItem('oauth_role');
          if (oauthRole) {
            safeStorage.removeItem('oauth_role'); // Clean up
            // Set justSignedUp to prevent loading issues
            setJustSignedUp(true);

            // Auto-clear justSignedUp after 5 seconds to allow dashboard to show
            timer = setTimeout(() => {
              setJustSignedUp(false);
            }, 5000);
          }
        }
      } catch (error) {
        console.warn('Storage access blocked by tracking prevention:', error);
      }
    };

    handleOAuthRedirect();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  // Listen for user signup event
  useEffect(() => {
    const handleUserSignedUp = (e: Event) => {
      setJustSignedUp(true);

      // Auto-clear justSignedUp after 5 seconds to allow dashboard to show
      // This handles cases where email confirmation happens in another tab/browser
      const timer = setTimeout(() => {
        setJustSignedUp(false);
      }, 5000);

      // Clean up the timer
      return () => clearTimeout(timer);
    };

    window.addEventListener('userSignedUp', handleUserSignedUp);

    return () => {
      window.removeEventListener('userSignedUp', handleUserSignedUp);
    };
  }, []);

  // ✅ Handle /auth/callback route for OAuth (support both path and hash-based routing)
  if (window.location.hash.startsWith('#/auth/callback') || window.location.pathname === '/auth/callback' || window.location.pathname === '/auth/callback/') {
    return <AuthCallback />;
  }

  // ✅ Handle /payment-success route FIRST
  if (window.location.pathname === '/payment-success') {
    return <PaymentSuccess />;
  }

  // ✅ Show loading if auth is still initializing
  if (loading && !justSignedUp) { // Don't show loading if user just signed up
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  // ✅ Show profile if requested
  if (showProfile && user && profile) {
    return <ProfileDashboard onBack={() => setShowProfile(false)} onSignOut={signOut} />;
  }

  // ✅ Authenticated & profile loaded → render dashboard
  if (user && profile) { // Removed !justSignedUp condition to allow dashboard after email confirmation
    // 🔐 Extra safety: ensure profile.role is valid
    const role = profile.role as Role | undefined;
    if (!role || !['customer', 'cafeteria', 'vendor', 'delivery_agent', 'admin'].includes(role)) {
      // Invalid role - redirect to customer home
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-6">
            <h2 className="text-xl font-bold text-red-700">Account Error</h2>
            <p className="mt-2 text-red-600">Your account role is invalid. Please contact support.</p>
            <button
              onClick={signOut}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    switch (role) {
      case 'customer':
        return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
      case 'cafeteria':
        return <CafeteriaDashboard onShowProfile={() => setShowProfile(true)} />;
      case 'vendor':
        return <VendorDashboard onShowProfile={() => setShowProfile(true)} />;
      case 'delivery_agent':
        return <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />;
      case 'admin':
        return <AdminDashboard onShowProfile={() => setShowProfile(true)} />;
      default:
        return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
    }
  }

  // ✅ Authed user, but profile still loading (rare, but possible)
  if (user && !profile) { // Removed !justSignedUp condition to allow profile loading after email confirmation
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ✅ Unauthenticated — show auth flows
  if (selectedRole === 'customer') {
    return authView === 'signup' ? (
      <SignUp
        role="customer"
        onBack={() => {
          setSelectedRole(null);
          setJustSignedUp(false); // Reset justSignedUp when going back
        }}
        onSwitchToSignIn={() => {
          setAuthView('signin');
          setJustSignedUp(false); // Reset justSignedUp when switching to sign in
        }}
      />
    ) : (
      <SignIn
        role="customer"
        onBack={() => setSelectedRole(null)}
        onSwitchToSignUp={() => setAuthView('signup')}
      />
    );
  }

  if (selectedRole && selectedRole !== 'customer') {
    return authView === 'signup' && (selectedRole === 'vendor' || selectedRole === 'late_night_vendor' || selectedRole === 'delivery_agent') ? (
      <SignUp
        role={selectedRole === 'late_night_vendor' ? 'late_night_vendor' : selectedRole}
        onBack={() => {
          setSelectedRole(null);
          setJustSignedUp(false); // Reset justSignedUp when going back
        }}
        onSwitchToSignIn={() => {
          setAuthView('signin');
          setJustSignedUp(false); // Reset justSignedUp when switching to sign in
        }}
      />
    ) : (
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

  // ✅ Default: landing
  return (
    <LandingPage
      onRoleSelect={(role) => {
        setSelectedRole(role);
        setAuthView('signin');
        setJustSignedUp(false); // Reset justSignedUp when selecting a new role
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
      alert('Configuration error: Missing Supabase credentials. Check your .env file.');
    }
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;