import React, { useState, useEffect } from 'react';
import { Menu, X, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  onRoleSelect: (role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin', signup?: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onRoleSelect }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, loading } = useAuth();

  // Auth guard: redirect logged-in users to their dashboard IMMEDIATELY
  // This is the FIX for Google Sign-In - redirect based on auth state, not button clicks
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Wait for auth to be fully loaded
      if (loading) {
        console.log('LandingPage: Still loading auth state...');
        return;
      }

      // If user is logged in and profile is loaded, redirect to dashboard
      if (user && profile) {
        console.log('LandingPage: User authenticated, redirecting to dashboard');
        // Clear any OAuth-related hash/params and redirect
        window.history.replaceState(null, '', window.location.pathname);
        window.location.hash = '';
        return;
      }

      // Also handle case where user exists but profile is still loading
      // Wait a bit longer for profile to load
      if (user && !profile) {
        console.log('LandingPage: User exists, waiting for profile...');
        // Give it a moment for profile to load
        const timer = setTimeout(() => {
          if (user && profile) {
            console.log('LandingPage: Profile loaded, redirecting to dashboard');
            window.history.replaceState(null, '', window.location.pathname);
            window.location.hash = '';
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    };

    checkAuthAndRedirect();
  }, [user, profile, loading]);

  const roles = [
    {
      id: 'cafeteria' as const,
      title: 'Cafeteria',
    },
    {
      id: 'vendor' as const,
      title: 'Student Vendors',
    },
    {
      id: 'delivery_agent' as const,
      title: 'Delivery Agents',
    },
    {
      id: 'admin' as const,
      title: 'Admin',
    },
  ];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signInWithGoogle, loading: authLoading } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Store that we're expecting an OAuth callback
      sessionStorage.setItem('oauth_redirect_pending', 'true');
      await signInWithGoogle();
      // Note: OAuth flow will redirect to AuthCallback which handles the redirect
    } catch (error) {
      console.error('Google login error:', error);
      sessionStorage.removeItem('oauth_redirect_pending');
    }
  };

  const handleRegister = () => {
    onRoleSelect('customer', true);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Full-screen food background with dark overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/1.jpg')",
        }}
      />
      <div className="fixed inset-0 bg-black bg-opacity-70" />

      {/* Header with transparent background */}
      <header className="relative z-50 bg-transparent">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <UtensilsCrossed className="h-8 w-8 text-white" />
              <span className="text-xl font-bold text-white">Vartica</span>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 transition-colors"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div className="hidden md:flex space-x-4">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => onRoleSelect(role.id)}
                  className="px-3 py-2 text-sm font-medium text-white hover:text-orange-400 hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-black bg-opacity-90 backdrop-blur-sm border-t border-white border-opacity-20">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    onRoleSelect(role.id);
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-white hover:text-orange-400 hover:bg-white hover:bg-opacity-20 rounded-md transition-colors"
                >
                  {role.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section with Login Form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Headline */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-2">
              Order Your Food
            </h1>
            <p className="text-base sm:text-xl text-white text-opacity-80">
              Welcome to Vartica!
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={authLoading}
                  className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>

              {/* Password Input */}
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-white placeholder-opacity-70 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                />
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white border-opacity-30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-white text-opacity-70">or</span>
                </div>
              </div>

              {/* Google Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white hover:bg-opacity-30 transition-all disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={authLoading}
                  className="px-4 py-3 bg-transparent border border-white border-opacity-50 rounded-xl text-white font-semibold hover:bg-white hover:bg-opacity-20 transition-all disabled:opacity-50"
                >
                  Register
                </button>
                <button
                  type="submit"
                  disabled={authLoading || !email || !password}
                  className="px-4 py-3 bg-orange-500 rounded-xl text-white font-semibold hover:bg-orange-600 transition-all transform hover:scale-105 disabled:opacity-50"
                >
                  {authLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>


    </div>
  );
};
