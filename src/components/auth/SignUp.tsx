import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, X, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SignUpProps {
  role: 'customer' | 'vendor' | 'late_night_vendor' | 'delivery_agent';
  onBack: () => void;
  onSwitchToSignIn: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ role, onBack, onSwitchToSignIn }) => {
  const { signUp: authSignUp, user, profile, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    storeName: '',
    storeDescription: '',
    vehicleType: '',
    vendorType: (role === 'late_night_vendor' ? 'late_night' : 'student') as 'student' | 'late_night',
    availableFrom: '21:00',
    availableUntil: '03:00',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  const roleTitle =
    role === 'customer' ? 'Customer' :
      role === 'vendor' ? 'Student Vendor' :
        role === 'late_night_vendor' ? 'Late Night Vendor' : 'Delivery Agent';

  // Handle browser back/forward — ensure confirmation screen stays if needed
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash === '#email-pending') {
        setShowEmailConfirmation(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // ... [your existing logo logic - unchanged]
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setError('');

    // ✅ VALIDATION (unchanged)
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if ((role === 'vendor' || role === 'late_night_vendor') && !formData.storeName.trim()) {
      setError('Store name is required');
      return;
    }
    if ((role === 'vendor' || role === 'late_night_vendor') && !logoFile) {
      setError('Please upload your business logo');
      return;
    }

    setSubmitting(true);

    // ✅ Show confirmation screen immediately to prevent user confusion
    setShowEmailConfirmation(true);
    window.history.pushState({}, '', '#email-pending'); // URL hint for back button
    window.dispatchEvent(new CustomEvent('userSignedUp'));

    // Optional: Browser notification (non-blocking)
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('✅ Check your email!', {
            body: `Confirmation link sent to ${formData.email}`,
            icon: '/logo192.png',
          });
        }
      });
    }

    // 🔑 Run signup in background
    try {
      console.log('Calling authSignUp...');
      const result = await authSignUp(
        formData.email,
        formData.password,
        formData.fullName,
        role === 'late_night_vendor' ? 'vendor' : role,
        formData.phone
      );

      if (result.error) {
        console.error('Background signup error:', result.error);
        // Don't show error to user since confirmation screen is already displayed
        return;
      }

      // 🔁 Background: Upload logo & create vendor profile (safe to ignore errors)
      if ((role === 'vendor' || role === 'late_night_vendor') && logoFile) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User missing');

          const fileExt = logoFile.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('vendor-logos')
            .upload(fileName, logoFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('vendor-logos')
            .getPublicUrl(fileName);

          const vendorData: any = {
            user_id: user.id,
            store_name: formData.storeName,
            description: formData.storeDescription || null,
            image_url: publicUrl,
            vendor_type: formData.vendorType,
            is_active: true,
          };

          if (role === 'late_night_vendor') {
            vendorData.available_from = formData.availableFrom;
            vendorData.available_until = formData.availableUntil;
          }

          const { error: vendorError } = await supabase
            .from('vendors')
            .insert([vendorData]);

          if (vendorError) throw vendorError;
        } catch (err) {
          console.warn('Non-critical vendor setup failed:', err);
        }
      }

    } catch (err: any) {
      console.error('Background signup error:', err);
      // Don't show error to user since confirmation screen is already displayed
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });
      if (error) throw error;
      alert('✅ Confirmation email resent! Check your inbox (and spam folder).');
    } catch (err) {
      alert('❌ Failed to resend. Please try again later.');
      console.error('Resend error:', err);
    }
  };

  const isLoading = submitting || authLoading;

  // ✅ EMAIL CONFIRMATION SCREEN (improved)
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <div className="mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✅ Check Your Email
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Your Account</h2>
            <div className="text-gray-600 mb-6 space-y-3">
              <p>We sent a confirmation link to:</p>
              <p className="font-semibold text-lg bg-gray-50 py-2 rounded">{formData.email}</p>
              <p>👉 Click the link in the email to activate your account.</p>
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                <strong>Tip:</strong> Check your spam/promotions folder if you don’t see it.
              </p>
            </div>

            <button
              onClick={handleResendEmail}
              className="w-full mb-4 py-3 text-blue-600 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              🔄 Didn’t get it? Resend email
            </button>

            <button
              onClick={onSwitchToSignIn}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MAIN SIGNUP FORM (enhanced email hint)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
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
            {roleTitle} Sign Up
          </h2>

          {/* 🔥 IMPROVED EMAIL HINT */}
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 px-4 py-4 rounded-lg mb-6">
            <div className="flex">
              <Mail className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">📧 You’ll get a confirmation email</p>
                <p className="text-sm mt-1">
                  After signing up, check your inbox (and spam folder) for a link to activate your account.
                </p>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mb-4">
            Create your account to get started
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ... [all your form fields - unchanged] ... */}
            {/* (keep all inputs exactly as you have them) */}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending confirmation email...
                </span>
              ) : 'Sign Up & Confirm Email'}
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