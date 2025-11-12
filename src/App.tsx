// src/App.tsx (NO ROUTER + PAYMENT SUCCESS) — FIXED
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { SignIn } from './components/auth/SignIn';
import { SignUp } from './components/auth/SignUp';
import { CustomerHome } from './components/customer/CustomerHome';
import { CafeteriaDashboard } from './components/cafeteria/CafeteriaDashboard';
import { DeliveryDashboard } from './components/delivery/DeliveryDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProfileDashboard } from './components/shared/ProfileDashboard';
import { PaymentSuccess } from './components/customer/PaymentSuccess';

type Role = 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin';
type AuthView = 'signin' | 'signup';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [authView, setAuthView] = useState<AuthView>('signin');
  const [showProfile, setShowProfile] = useState(false);

  // 🔍 Optional: Debug — remove in production
  useEffect(() => {
    console.log('🔍 AppContent re-rendered | user:', !!user, 'profile:', !!profile, 'loading:', loading);
  }, [user, profile, loading]);

  // ✅ Handle /payment-success route FIRST
  if (window.location.pathname === '/payment-success') {
    return <PaymentSuccess />;
  }

  // ✅ Show loading if auth is still initializing
  if (loading) {
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
  if (user && profile) {
    // 🔐 Extra safety: ensure profile.role is valid
    const role = profile.role as Role | undefined;
    if (!role || !['customer', 'cafeteria', 'vendor', 'delivery_agent', 'admin'].includes(role)) {
      console.error('⚠️ Invalid role in profile:', profile.role);
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
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center p-6 max-w-md">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Vendor Dashboard</h1>
              <p className="text-gray-600 mb-4">Coming soon — your student vendor space is being prepared!</p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        );
      case 'delivery_agent':
        return <DeliveryDashboard onShowProfile={() => setShowProfile(true)} />;
      case 'admin':
        return <AdminDashboard onShowProfile={() => setShowProfile(true)} />;
      default:
        return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
    }
  }

  // ✅ Authed user, but profile still loading (rare, but possible)
  if (user && !profile) {
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
        onBack={() => setSelectedRole(null)}
        onSwitchToSignIn={() => setAuthView('signin')}
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
    return authView === 'signup' && (selectedRole === 'vendor' || selectedRole === 'delivery_agent') ? (
      <SignUp
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
        onSwitchToSignIn={() => setAuthView('signin')}
      />
    ) : (
      <SignIn
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
        onSwitchToSignUp={
          selectedRole === 'vendor' || selectedRole === 'delivery_agent'
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
      }}
    />
  );
}

function App() {
  useEffect(() => {
    // 🔧 Console hygiene
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes('Extension context invalidated')) return;
      originalError.apply(console, args);
    };

    // 🔍 Env check
    console.log('✅ Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log(
      '✅ Supabase Anon Key (first 8 chars):',
      import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 8) + '...'
    );

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error('❌ MISSING ENV VARS! Check .env.local');
    }
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;