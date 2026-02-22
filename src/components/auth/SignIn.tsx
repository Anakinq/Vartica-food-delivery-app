import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

interface SignInProps {
  role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin';
  onBack: () => void;
  onSwitchToSignUp?: () => void;
}

export const SignIn: React.FC<SignInProps> = ({ role, onBack, onSwitchToSignUp }) => {
  const { signIn, signInWithGoogle, user, profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
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

  // No role checking during login - let route guards handle authorization

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== SIGN IN ATTEMPT STARTED ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    setError('');
    setSubmitting(true);

    try {
      console.log('Calling signIn function from AuthContext...');
      await signIn(email, password);
      console.log('SignIn function completed successfully');
    } catch (err: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Sign in error:', err);
        if (err instanceof Error) {
          console.error('Actual error message:', err.message);
          console.error('Error type:', typeof err.message);
          console.error('Error code:', (err as any).code);
        }
      }

      // Provide more specific error messages
      let errorMessage = 'Failed to sign in';

      if (err instanceof Error) {
        // Check for specific error codes/messages
        if (err.message) {
          const lowerMessage = err.message.toLowerCase();
          console.log('Lowercase error message:', lowerMessage); // Debug log

          if ((err as any).code === 'AUTH_COOLDOWN') {
            errorMessage = 'Please wait before trying again';
          } else if (lowerMessage.includes('invalid login credentials') ||
            lowerMessage.includes('invalid credentials') ||
            lowerMessage.includes('wrong password') ||
            lowerMessage.includes('incorrect password') ||
            (lowerMessage.includes('invalid') && lowerMessage.includes('credentials'))) {
            errorMessage = 'Invalid email or password. Please try again.';
          } else if (err.message.toLowerCase().includes('email not confirmed')) {
            errorMessage = 'Email not confirmed. Please check your email for a confirmation link.';
          } else if (err.message.toLowerCase().includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (err.message.toLowerCase().includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
          } else {
            // Use the original error message if it's descriptive
            errorMessage = err.message;
          }
        }
      }

      setError(errorMessage);
      // Ensure the error state persists by preventing any automatic navigation
      // Keep the submitting state false to allow resubmission
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Google sign in error:', err);
        if (err instanceof Error) {
          console.error('Error code:', (err as any).code);
        }
      }

      // Provide more specific error messages for Google sign-in
      let errorMessage = 'Failed to sign in with Google';

      if (err instanceof Error) {
        // Check for specific error codes/messages
        if (err.message) {
          if ((err as any).code === 'AUTH_COOLDOWN') {
            errorMessage = 'Please wait before trying again';
          } else if (err.message.toLowerCase().includes('access denied')) {
            errorMessage = 'Access denied. You must grant permission to continue with Google.';
          } else if (err.message.toLowerCase().includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (err.message.toLowerCase().includes('popup')) {
            errorMessage = 'Popup blocked. Please allow popups for this site and try again.';
          } else {
            // Use the original error message if it's descriptive
            errorMessage = err.message;
          }
        }
      }

      setError(errorMessage);
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

      if (error) {
        throw error;
      }

      showToast('✅ Password reset email sent! Check your inbox (and spam folder).', 'success');
      setForgotPasswordMode(false);
    } catch (err: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Forgot password error:', err);
      }

      // Provide more specific error messages for forgot password
      let errorMessage = 'Failed to send reset email';

      if (err instanceof Error) {
        // Check for specific error codes/messages
        if (err.message) {
          if (err.message.toLowerCase().includes('email not found')) {
            errorMessage = 'Email not found. Please check the email address and try again.';
          } else if (err.message.toLowerCase().includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            // Use the original error message if it's descriptive
            errorMessage = err.message;
          }
        }
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || authLoading;

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

      {/* Main content with proper z-index */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <button
            onClick={onBack}
            className="flex items-center text-white text-opacity-80 hover:text-white mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8 border border-white border-opacity-20">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {forgotPasswordMode ? 'Reset Password' : `${roleTitle} Sign In`}
            </h2>
            <p className="text-white text-opacity-80 mb-6">
              {forgotPasswordMode
                ? 'Enter your email to receive a password reset link'
                : 'Enter your credentials to continue'}
            </p>

            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-400 text-red-200 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form
              onSubmit={forgotPasswordMode ? handleForgotPassword : handleSignIn}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-white text-opacity-90 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-white placeholder-opacity-50"
                  placeholder="you@university.edu"
                />
              </div>

              {!forgotPasswordMode && (
                <div>
                  <label className="block text-sm font-medium text-white text-opacity-90 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-white placeholder-opacity-50"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center"
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
                    <div className="w-full border-t border-white border-opacity-30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white bg-opacity-10 text-white text-opacity-70">Or continue with</span>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white hover:bg-opacity-20 transition-all disabled:opacity-50"
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
                    className="text-sm text-orange-300 hover:text-orange-200 font-medium"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>

                  {onSwitchToSignUp && role !== 'cafeteria' && role !== 'admin' && (
                    <p className="text-white text-opacity-80">
                      Don't have an account?{' '}
                      <button
                        onClick={onSwitchToSignUp}
                        className="text-orange-300 hover:text-orange-200 font-semibold"
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
                  className="text-sm text-white text-opacity-80 hover:text-white font-medium"
                >
                  ← Back to Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};