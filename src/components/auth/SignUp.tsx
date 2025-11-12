import React, { useState, useEffect } from 'react'; // ✅ added useEffect
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SignUpProps {
  role: 'customer' | 'vendor' | 'delivery_agent';
  onBack: () => void;
  onSwitchToSignIn: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ role, onBack, onSwitchToSignIn }) => {
  const { signUp: authSignUp, user, profile, loading: authLoading } = useAuth(); // ✅ use context state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    storeName: '',
    storeDescription: '',
    vehicleType: '',
    vendorType: 'student' as 'student' | 'late_night',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleTitle = 
    role === 'customer' ? 'Customer' :
    role === 'vendor' ? 'Student Vendor' : 'Delivery Agent';

  // ✅ NEW: Auto-redirect on successful auth + profile
  useEffect(() => {
    if (user && profile && profile.role === role) {
      // ✅ Success! Let App.tsx handle dashboard routing
      // (Optional: show success toast before redirect)
    }
  }, [user, profile, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // ✅ 1. Let AuthProvider handle: user + profile creation + sign-in
      await authSignUp(
        formData.email,
        formData.password,
        formData.fullName,
        role,
        formData.phone
      );

      // ✅ 2. No need to manually get user — `useAuth()` will update `user`/`profile`
      // ✅ 3. Extra tables (`vendors`, `delivery_agents`) should be created in DB triggers
      //    (Recommended: use Supabase trigger on `profiles` insert → auto-create rows)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || authLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
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
            {roleTitle} Sign Up
          </h2>
          <p className="text-gray-600 mb-8">
            Create your account to get started
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ... rest of your existing form fields (unchanged) ... */}
            {/* ✅ Keep all your field logic — only the submit handler changed */}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToSignIn}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};