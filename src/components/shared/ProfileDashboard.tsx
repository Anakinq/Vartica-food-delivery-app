import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Save, LogOut, Moon, Sun, Bell, Lock, HelpCircle, CreditCard, MapPin, MessageCircle, Camera, Store, ArrowLeftRight, Download, Building2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase/client';
import { CustomerSupportModal } from './CustomerSupportModal';
import { ExtendedProfile } from '../../types';
import { VendorUpgradeModal } from '../customer/VendorUpgradeModal';
import { DeliveryAgentUpgradeModal } from '../customer/DeliveryAgentUpgradeModal';
import InstallPrompt from '../InstallPrompt';

export const ProfileDashboard: React.FC<{ onBack: () => void; onSignOut: () => void; onClose?: () => void }> = ({ onBack, onSignOut, onClose }) => {
  const { profile, refreshProfile } = useAuth();
  const { currentRole, switchRole, isSwitching } = useRole();
  const { showToast } = useToast();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showVendorUpgrade, setShowVendorUpgrade] = useState(false);
  const [showDeliveryAgentUpgrade, setShowDeliveryAgentUpgrade] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Determine current view based on hash
  const [currentView, setCurrentView] = useState<'customer' | 'vendor'>('customer');
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/vendor' || hash === '#/vendor-orders' || hash === '#/vendor-earnings') {
      setCurrentView('vendor');
    } else {
      setCurrentView('customer');
    }
  }, []);

  // Bank account state
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [isBankVerified, setIsBankVerified] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [loadingBank, setLoadingBank] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [hostelLocation, setHostelLocation] = useState((profile as ExtendedProfile)?.hostel_location || '');
  const [avatarUrl, setAvatarUrl] = useState((profile as ExtendedProfile)?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage && localStorage.getItem('darkMode') === 'true';
    } catch (error) {
      console.warn('Storage access blocked by tracking prevention:', error);
      return false; // Default to light mode if storage is blocked
    }
  });

  // Profile completion state
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: false,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      });
      setHostelLocation((profile as ExtendedProfile).hostel_location || '');
      setAvatarUrl((profile as ExtendedProfile).avatar_url || '');

      // Calculate profile completion
      const fields = [
        profile.full_name,
        profile.phone,
        (profile as ExtendedProfile).hostel_location,
        (profile as ExtendedProfile).avatar_url
      ];
      const completed = fields.filter(field => field).length;
      setProfileCompletion((completed / fields.length) * 100);
    }
  }, [profile]);

  // Fetch bank details on mount
  useEffect(() => {
    if (profile?.id && (profile.role === 'vendor' || (profile as any).role === 'late_night_vendor')) {
      fetchBankDetails();
    }
  }, [profile]);

  // Nigerian banks list
  const BANK_OPTIONS = [
    { code: '044', name: 'Access Bank' },
    { code: '063', name: 'Access Bank (Diamond)' },
    { code: '035A', name: 'ALAT by WEMA' },
    { code: '401', name: 'ASO Savings and Loans' },
    { code: '023', name: 'Citibank Nigeria' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '562', name: 'Ekondo Microfinance Bank' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '214', name: 'First City Monument Bank' },
    { code: '058', name: 'Guaranty Trust Bank' },
    { code: '030', name: 'Heritage Bank' },
    { code: '301', name: 'Jaiz Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '559', name: 'Kuda Bank' },
    { code: '50211', name: 'Kuda Microfinance Bank' },
    { code: '999992', name: 'OPay' },
    { code: '526', name: 'Parallex Bank' },
    { code: '999991', name: 'PalmPay' },
    { code: '076', name: 'Polaris Bank' },
    { code: '101', name: 'Providus Bank' },
    { code: '125', name: 'Rubies MFB' },
    { code: '232', name: 'Sterling Bank' },
    { code: '068', name: 'Standard Chartered Bank' },
    { code: '033', name: 'Union Bank of Nigeria' },
    { code: '032', name: 'United Bank For Africa' },
    { code: '215', name: 'Unity Bank' },
    { code: '035', name: 'Wema Bank' },
    { code: '057', name: 'Zenith Bank' },
  ];

  // Fetch bank details from database
  const fetchBankDetails = async () => {
    if (!profile?.id) return;
    try {
      setLoadingBank(true);
      const { data: payoutData, error } = await supabase
        .from('vendor_payout_profiles')
        .select('*')
        .eq('vendor_id', profile.id)
        .single();

      if (payoutData && !error) {
        setBankAccount(payoutData.account_number || '');
        setBankCode(payoutData.bank_code || '');
        setBankName(payoutData.account_name || 'Unknown Bank');
        setIsBankVerified(payoutData.verified || true);
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    } finally {
      setLoadingBank(false);
    }
  };

  // Save bank details
  const saveBankDetails = async () => {
    if (!profile) return;

    if (bankAccount.length !== 10 || !bankCode) {
      showToast({ type: 'error', message: 'Please enter a valid 10-digit account number and select a bank.' });
      return;
    }

    if (!/^\d{10}$/.test(bankAccount)) {
      showToast({ type: 'error', message: 'Account number must be exactly 10 digits.' });
      return;
    }

    setSavingBank(true);
    try {
      // First check if vendor record exists
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (!vendorData) {
        showToast({ type: 'error', message: 'Vendor record not found. Please contact support.' });
        setSavingBank(false);
        return;
      }

      // Check for existing payout profile
      const { data: existingProfile } = await supabase
        .from('vendor_payout_profiles')
        .select('id')
        .eq('vendor_id', vendorData.id)
        .single();

      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('vendor_payout_profiles')
          .update({
            account_number: bankAccount.trim(),
            account_name: profile.full_name || 'Unknown',
            bank_code: bankCode,
            verified: false
          })
          .eq('vendor_id', vendorData.id)
          .select();
      } else {
        // Create new profile
        result = await supabase
          .from('vendor_payout_profiles')
          .insert([{
            vendor_id: vendorData.id,
            user_id: profile.id,
            account_number: bankAccount.trim(),
            account_name: profile.full_name || 'Unknown',
            bank_name: bankName || '',
            bank_code: bankCode,
            verified: false
          }])
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      showToast('Bank details saved successfully!', 'success');
      setIsBankVerified(false);
      setShowBankModal(false);
    } catch (error: any) {
      console.error('Save bank error:', error);
      showToast(`Failed to save bank details: ${error.message}`, 'error');
    } finally {
      setSavingBank(false);
    }
  };

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('darkMode', darkMode.toString());
      }
    } catch (error) {
      console.warn('Storage access blocked by tracking prevention:', error);
    }
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showToast('Image file must be less than 2MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setAvatarUrl(''); // Clear current avatar URL so preview shows
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarUrl(''); // This will show the initials again
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setSuccess(false);

    try {
      // Handle avatar upload if a new avatar was selected
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        // Upload avatar to Supabase storage
        const fileName = `avatars/${profile.id}-${Date.now()}-${avatarFile.name}`;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) {
          console.error('Avatar upload failed:', uploadError);
          showToast('Failed to upload avatar image. Please try again.', 'error');
          throw uploadError;
        }

        // Get public URL
        const { data: publicUrlData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          hostel_location: hostelLocation,
          avatar_url: finalAvatarUrl,
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Clear profile cache to ensure fresh data
      sessionStorage.removeItem(`profile_with_vendor_${profile.id}`);

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Header */}
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-3 sm:px-4">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center">
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-lg sm:text-xl font-bold text-black dark:text-white ml-3 sm:ml-4">My Profile</h1>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
          {/* Profile Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-white"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.onerror = null; // prevents looping
                      target.src = 'https://placehold.co/150x150/4ade80/ffffff?text=' + (profile.full_name?.charAt(0).toUpperCase() || 'U');
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
                  <div className="relative">
                    <label htmlFor="avatar-upload" className="cursor-pointer">
                      <Camera className="h-6 w-6 text-gray-600 dark:text-gray-300 hover:text-green-600" />
                      <input
                        id="avatar-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-black dark:text-white truncate">{profile.full_name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{profile.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-medium rounded-full capitalize">
                  {profile.role}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Completion Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Completion</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">{Math.round(profileCompletion)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
            </div>
            {profileCompletion < 100 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Complete your profile to unlock all features
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mb-4 sm:mb-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold transition-all ${activeTab === 'profile'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold transition-all ${activeTab === 'settings'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              Settings
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-black dark:text-white mb-4 sm:mb-6">Edit Profile</h3>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-black dark:text-white mb-3">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black dark:text-white mb-3">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-900 border-0 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black dark:text-white mb-3">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                      placeholder="+234 801 234 5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black dark:text-white mb-3">
                    Hostel Location
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <select
                      value={hostelLocation}
                      onChange={(e) => setHostelLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                    >
                      <option value="">Select your hostel</option>
                      <option value="New Female Hostel 1">New Female Hostel 1</option>
                      <option value="New Female Hostel 2">New Female Hostel 2</option>
                      <option value="Abuad Hostel">Abuad Hostel</option>
                      <option value="Wema Hostel">Wema Hostel</option>
                      <option value="Male Hostel 1">Male Hostel 1</option>
                      <option value="Male Hostel 2">Male Hostel 2</option>
                      <option value="Male Hostel 3">Male Hostel 3</option>
                      <option value="Male Hostel 4">Male Hostel 4</option>
                      <option value="Male Hostel 5">Male Hostel 5</option>
                      <option value="Male Hostel 6">Male Hostel 6</option>
                      <option value="Medical Male Hostel 1">Medical Male Hostel 1</option>
                      <option value="Medical Male Hostel 2">Medical Male Hostel 2</option>
                      <option value="Female Medical Hostel 1">Female Medical Hostel 1</option>
                      <option value="Female Medical Hostel 2">Female Medical Hostel 2</option>
                      <option value="Female Medical Hostel 3">Female Medical Hostel 3</option>
                      <option value="Female Medical Hostel 4">Female Medical Hostel 4</option>
                      <option value="Female Medical Hostel 5">Female Medical Hostel 5</option>
                      <option value="Female Medical Hostel 6">Female Medical Hostel 6</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex items-center px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors w-full justify-center"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Sign Out
                  </button>

                  {/* Role-related buttons */}
                  {/* For pure customers: show switch to vendor + become delivery agent */}
                  {profile?.role === 'customer' && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            // Close the profile dashboard first
                            if (onClose) {
                              onClose();
                            } else if (onBack) {
                              onBack();
                            }
                            // Switch to vendor role using RoleContext
                            await switchRole('vendor');
                          } catch (error) {
                            console.error('Failed to switch to vendor:', error);
                            showToast('Failed to switch to vendor view', 'error');
                          }
                        }}
                        disabled={isSwitching}
                        className="flex items-center px-6 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors w-full justify-center disabled:opacity-50"
                      >
                        <ArrowLeftRight className="h-5 w-5 mr-2" />
                        {isSwitching ? 'Switching...' : 'Switch to Vendor View'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeliveryAgentUpgrade(true)}
                        className="flex items-center px-6 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-semibold hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors w-full justify-center"
                      >
                        Become a Delivery Agent
                      </button>
                    </>
                  )}

                  {/* For vendors: show switch view button based on current view */}
                  {(profile?.role === 'vendor' || (profile as any)?.role === 'late_night_vendor') && (
                    <>
                      {currentRole === 'vendor' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              // Close the profile dashboard first
                              if (onClose) {
                                onClose();
                              } else if (onBack) {
                                onBack();
                              }
                              // Switch to customer role using RoleContext
                              await switchRole('customer');
                            } catch (error) {
                              console.error('Failed to switch to customer:', error);
                              showToast('Failed to switch to customer view', 'error');
                            }
                          }}
                          disabled={isSwitching}
                          className="flex items-center px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors w-full justify-center disabled:opacity-50"
                        >
                          <ArrowLeftRight className="h-5 w-5 mr-2" />
                          {isSwitching ? 'Switching...' : 'Switch to Customer View'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              // Close the profile dashboard first
                              if (onClose) {
                                onClose();
                              } else if (onBack) {
                                onBack();
                              }
                              // Switch to vendor role using RoleContext
                              await switchRole('vendor');
                            } catch (error) {
                              console.error('Failed to switch to vendor:', error);
                              showToast('Failed to switch to vendor view', 'error');
                            }
                          }}
                          disabled={isSwitching}
                          className="flex items-center px-6 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors w-full justify-center disabled:opacity-50"
                        >
                          <ArrowLeftRight className="h-5 w-5 mr-2" />
                          {isSwitching ? 'Switching...' : 'Switch to Vendor View'}
                        </button>
                      )}
                    </>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg"
                    >
                      {loading ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
                      {!loading && !success && <Save className="h-5 w-5 ml-2" />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Dark Mode Setting */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {darkMode ? <Moon className="h-6 w-6 text-gray-700 dark:text-gray-300" /> : <Sun className="h-6 w-6 text-gray-700 dark:text-gray-300" />}
                    <div>
                      <h3 className="font-bold text-black dark:text-white">Dark Mode</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Toggle dark theme</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${darkMode ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
                <h3 className="font-bold text-black dark:text-white mb-4 flex items-center">
                  <Bell className="h-6 w-6 mr-2" />
                  Notifications
                </h3>

                {[
                  { key: 'orderUpdates', label: 'Order Updates', desc: 'Get notified about order status' },
                  { key: 'promotions', label: 'Promotions', desc: 'Receive special offers and deals' },
                  { key: 'newsletter', label: 'Newsletter', desc: 'Weekly food & dining tips' }
                ].map((item, index) => (
                  <div key={item.key} className={`flex items-center justify-between py-3 ${index < 2 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
                    <div>
                      <p className="font-medium text-black dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bank Details for Vendors */}
              {(profile.role === 'vendor' || (profile as any).role === 'late_night_vendor') && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-6 w-6 text-purple-600" />
                        <div>
                          <h3 className="font-bold text-black dark:text-white">Bank Details</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">For withdrawals</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowBankModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        {isBankVerified ? 'Update' : 'Set Up'}
                      </button>
                    </div>
                    {loadingBank ? (
                      <p className="text-gray-500">Loading...</p>
                    ) : bankAccount ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {bankName} •••• {bankAccount.slice(-4)}
                        </p>
                        {isBankVerified ? (
                          <p className="text-xs text-green-600 mt-1">✓ Verified</p>
                        ) : (
                          <p className="text-xs text-yellow-600 mt-1">Pending verification</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No bank account set up</p>
                    )}
                  </div>
                </div>
              )}

              {/* Other Settings */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {[
                  { icon: Download, title: 'Download App', desc: 'Install Vartica Food on your device' },
                  { icon: Lock, title: 'Privacy & Security', desc: 'Manage your account security' },
                  { icon: CreditCard, title: 'Payment Methods', desc: 'Manage saved cards' },
                  { icon: MapPin, title: 'Saved Addresses', desc: 'Manage delivery locations' },
                  { icon: MessageCircle, title: 'Contact Support', desc: 'Send a message to our team' }
                ].map((item, index) => (
                  <React.Fragment key={item.title}>
                    {index > 0 && <div className="border-t border-gray-100 dark:border-gray-700" />}
                    <button
                      className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => {
                        if (item.title === 'Contact Support') {
                          setShowSupportModal(true);
                        } else if (item.title === 'Download App') {
                          setShowDownloadModal(true);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <item.icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                        <div className="text-left">
                          <h3 className="font-bold text-black dark:text-white">{item.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSupportModal && (
        <CustomerSupportModal
          onClose={() => setShowSupportModal(false)}
        />
      )}

      {/* Vendor Upgrade Modal */}
      {showVendorUpgrade && (
        <VendorUpgradeModal
          isOpen={showVendorUpgrade}
          onClose={() => setShowVendorUpgrade(false)}
          onSuccess={async () => {
            setShowVendorUpgrade(false);
            // Refresh the profile to reflect the role change
            try {
              await refreshProfile();
            } catch (error) {
              console.error('Error refreshing profile:', error);
              // Fallback to showing a message to user
              showToast({ type: 'info', message: 'Please refresh the page to see profile changes.' });
            }
          }}
        />
      )}

      {/* Delivery Agent Upgrade Modal */}
      {showDeliveryAgentUpgrade && (
        <DeliveryAgentUpgradeModal
          isOpen={showDeliveryAgentUpgrade}
          onClose={() => setShowDeliveryAgentUpgrade(false)}
          onSuccess={async () => {
            setShowDeliveryAgentUpgrade(false);
            // Refresh the profile to reflect the role change
            try {
              await refreshProfile();
              showToast('Application submitted! Your delivery agent account is pending admin approval. You will be notified once approved.', 'success');
            } catch (error) {
              console.error('Error refreshing profile:', error);
              showToast('Application submitted! Awaiting admin approval.', 'success');
            }
          }}
        />
      )}

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Download App Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black dark:text-white">Download Vartica Food</h2>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500 rotate-180" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="h-8 w-8 text-blue-600" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Install as App</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tap the <strong>Share</strong> button (iOS) or <strong>Menu</strong> (Android) and select <strong>"Add to Home Screen"</strong>
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium text-black dark:text-white">Benefits of installing:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Faster access from home screen</li>
                  <li>• Works offline (basic features)</li>
                  <li>• Push notifications for orders</li>
                  <li>• Full-screen experience</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <strong>iOS (Safari):</strong> Tap Share → Add to Home Screen
                  <br />
                  <strong>Android (Chrome):</strong> Tap Menu → Install App
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDownloadModal(false)}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black dark:text-white">Bank Details</h2>
              <button
                onClick={() => setShowBankModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                <select
                  value={bankCode}
                  onChange={(e) => {
                    setBankCode(e.target.value);
                    const bank = BANK_OPTIONS.find(b => b.code === e.target.value);
                    setBankName(bank?.name || '');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-black dark:text-white"
                >
                  <option value="">Select Bank</option>
                  {BANK_OPTIONS.map(bank => (
                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit account number"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-black dark:text-white placeholder-gray-400"
                  maxLength={10}
                />
              </div>

              {bankCode && bankAccount.length === 10 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Account Name:</p>
                  <p className="font-medium text-black dark:text-white">{profile?.full_name || 'Loading...'}</p>
                </div>
              )}

              {!isBankVerified && bankAccount && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Your bank details will be verified when you make your first withdrawal.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBankModal(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBankDetails}
                  disabled={savingBank || bankAccount.length !== 10 || !bankCode}
                  className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  {savingBank ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

