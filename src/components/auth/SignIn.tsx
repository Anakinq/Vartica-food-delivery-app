import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SignInProps {
  role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin';
  onBack: () => void;
  onSwitchToSignUp?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ role, onBack, onSwitchToSignUp }) => {
  const { signIn, user, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  // ✅ Define roleTitle early — fixes "roleTitle is not defined"
  const roleTitle = {
    customer: 'Customer',
    cafeteria: 'Cafeteria',
    vendor: 'Student Vendor',
    delivery_agent: 'Delivery Agent',
    admin: 'Admin',
  }[role];

  // ✅ Redirect on auth success
  useEffect(() => {
    if (user && profile && profile.role === role) {
      window.location.reload();
    } else if (user && profile && profile.role !== role) {
      setError(`This account is registered as a ${profile.role}, not a ${role}.`);
    }
  }, [user, profile, role]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!email) {
      setError('Please enter your email');
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      alert('✅ Password reset email sent! Check your inbox (and spam folder).');
      setForgotPasswordMode(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || authLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {forgotPasswordMode ? 'Reset Password' : `${roleTitle} Sign In`}
          </h2>
          <p className="text-gray-600 mb-6">
            {forgotPasswordMode
              ? 'Enter your email to receive a password reset link'
              : 'Enter your credentials to continue'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form 
            onSubmit={forgotPasswordMode ? handleForgotPassword : handleSignIn} 
            className="space-y-6"
          >
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

            {!forgotPasswordMode && (
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
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
            >
              {isLoading 
                ? (forgotPasswordMode ? 'Sending...' : 'Signing in...') 
                : (forgotPasswordMode ? 'Send Reset Link' : 'Sign In')}
            </button>
          </form>

          {/* ✅ Toggle between sign-in and forgot-password */}
          <div className="mt-6 text-center space-y-3">
            {!forgotPasswordMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setForgotPasswordMode(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>

                {onSwitchToSignUp && role !== 'cafeteria' && role !== 'admin' && (
                  <p className="text-gray-600">
                    Don't have an account?{' '}
                    <button
                      onClick={onSwitchToSignUp}
                      className="text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Sign Up
                    </button>
                  </p>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setForgotPasswordMode(false)}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};