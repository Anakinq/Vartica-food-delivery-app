import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './components/LandingPage';
import { SignIn } from './components/auth/SignIn';
import { SignUp } from './components/auth/SignUp';
import { CustomerHome } from './components/customer/CustomerHome';
import { CafeteriaDashboard } from './components/cafeteria/CafeteriaDashboard';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import { DeliveryDashboard } from './components/delivery/DeliveryDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProfileDashboard } from './components/shared/ProfileDashboard';

type Role = 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin';
type AuthView = 'signin' | 'signup';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [authView, setAuthView] = useState<AuthView>('signin');
  const [showProfile, setShowProfile] = useState(false); // 👈 Added profile state

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

  // Show Profile Dashboard if requested
  if (showProfile && user && profile) {
    return (
      <ProfileDashboard 
        onBack={() => setShowProfile(false)} 
        onSignOut={signOut} 
      />
    );
  }

  // Authenticated users go to their dashboard
  if (user && profile) {
    switch (profile.role) {
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

  // Handle customer auth flow
  if (selectedRole === 'customer') {
    if (authView === 'signup') {
      return (
        <SignUp
          role="customer"
          onBack={() => setSelectedRole(null)}
          onSwitchToSignIn={() => setAuthView('signin')}
        />
      );
    }
    return (
      <SignIn
        role="customer"
        onBack={() => setSelectedRole(null)}
        onSwitchToSignUp={() => setAuthView('signup')}
      />
    );
  }

  // Handle other roles (cafeteria, vendor, etc.)
  if (selectedRole && selectedRole !== 'customer') {
    if (authView === 'signup' && (selectedRole === 'vendor' || selectedRole === 'delivery_agent')) {
      return (
        <SignUp
          role={selectedRole}
          onBack={() => setSelectedRole(null)}
          onSwitchToSignIn={() => setAuthView('signin')}
        />
      );
    }

    return (
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

  // Show landing page
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;