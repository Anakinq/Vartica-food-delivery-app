// src/App.tsx (NO ROUTER + PAYMENT SUCCESS)
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

  // Handle /payment-success route
  if (window.location.pathname === '/payment-success') {
    return <PaymentSuccess />;
  }

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

  if (showProfile && user && profile) {
    return <ProfileDashboard onBack={() => setShowProfile(false)} onSignOut={signOut} />;
  }

  if (user && profile) {
    switch (profile.role) {
      case 'customer':
        return <CustomerHome onShowProfile={() => setShowProfile(true)} />;
      case 'cafeteria':
        return <CafeteriaDashboard onShowProfile={() => setShowProfile(true)} />;
      case 'vendor':
        // TODO: Create VendorDashboard component
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Vendor Dashboard</h1>
              <p className="text-gray-600 mb-4">Coming soon...</p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    // Clear console spam from browser extensions
    const originalError = console.error;
    console.error = (...args) => {
      // Filter out browser extension errors
      if (args[0]?.toString().includes('Extension context invalidated')) {
        return;
      }
      originalError.apply(console, args);
    };

    console.log('✅ Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log(
      '✅ Supabase Anon Key (first 8 chars):',
      import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 8) + '...'
    );

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error('❌ MISSING ENVIRONMENT VARIABLES! Check your .env file');
    }
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;