import React, { useState, useEffect } from 'react'; // ✅ added useEffect
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SignInProps {
  role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin';
  onBack: () => void;
  onSwitchToSignUp?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ role, onBack, onSwitchToSignUp }) => {
  const { signIn, user, profile, loading: authLoading } = useAuth(); // ✅ pull user/profile/authLoading
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false); // renamed to avoid conflict

  const roleTitle = {
    customer: 'Customer',
    cafeteria: 'Cafeteria',
    vendor: 'Student Vendor',
    delivery_agent: 'Delivery Agent',
    admin: 'Admin',
  }[role];

  // ✅ NEW: Redirect on successful sign-in
  useEffect(() => {
    if (user && profile) {
      // Optional: verify role matches (extra safety)
      if (profile.role === role) {
        // 👇 Replace this with your actual navigation logic:
        // - React Router: navigate('/dashboard')
        // - Window redirect: window.location.href = '/dashboard'
        console.log('✅ Auth success — redirecting...');
        window.location.reload(); // quick fix: reload to let App.tsx render protected view
        // OR better: use your router
      } else {
        setError(`This account is registered as a ${profile.role}, not a ${role}.`);
      }
    }
  }, [user, profile, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email, password);
      // ✅ Success → handled by useEffect above
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Show loading from AuthContext (more accurate than local submitting)
  const isLoading = submitting || authLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {roleTitle} Sign In
          </h2>
          <p className="text-gray-600 mb-8">
            Enter your credentials to continue
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {onSwitchToSignUp && role !== 'cafeteria' && role !== 'admin' && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={onSwitchToSignUp}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Sign Up
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};