import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SignInProps {
  role: 'customer' | 'cafeteria' | 'vendor' | 'admin';
  onBack: () => void;
  onSwitchToSignUp?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ role, onBack, onSwitchToSignUp }) => {
  const { signIn, signInWithGoogle, user, profile, loading: authLoading } = useAuth();
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
    admin: 'Admin',
  }[role];

  // ✅ Redirect on auth success
  useEffect(() => {
    if (user && profile && profile.role !== role) {
      setError(`This account is registered as a ${profile.role}, not a ${role}.`);
    }
    // Note: No need to reload - AuthContext + App.tsx handle routing automatically
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

  // ✅ Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
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
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {forgotPasswordMode ? 'Sending...' : 'Signing in...'}
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  {forgotPasswordMode ? 'Send Reset Link' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* ✅ Google Sign In Button - Only for non-cafeteria and non-admin roles */}
          {!forgotPasswordMode && role !== 'cafeteria' && role !== 'admin' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
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
                  Sign in with Google
                </button>
              </div>
            </div>
          )}

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