import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Save, LogOut, Moon, Sun, Bell, Lock, HelpCircle, CreditCard, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const ProfileDashboard: React.FC<{ onBack: () => void; onSignOut: () => void }> = ({ onBack, onSignOut }) => {
  const { profile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
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
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      alert('Failed to update profile');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-black dark:text-white ml-4">My Profile</h1>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {profile.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-black dark:text-white">{profile.full_name}</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-medium rounded-full capitalize">
                {profile.role}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${activeTab === 'profile'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${activeTab === 'settings'
                ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            Settings
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h3 className="text-lg font-bold text-black dark:text-white mb-6">Edit Profile</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
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

              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex items-center px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-lg"
                >
                  {loading ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
                  {!loading && !success && <Save className="h-5 w-5 ml-2" />}
                </button>
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

            {/* Other Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              {[
                { icon: Lock, title: 'Privacy & Security', desc: 'Manage your account security' },
                { icon: CreditCard, title: 'Payment Methods', desc: 'Manage saved cards' },
                { icon: MapPin, title: 'Saved Addresses', desc: 'Manage delivery locations' },
                { icon: HelpCircle, title: 'Help & Support', desc: 'Get help or contact us' }
              ].map((item, index) => (
                <React.Fragment key={item.title}>
                  {index > 0 && <div className="border-t border-gray-100 dark:border-gray-700" />}
                  <button className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
  );
};
