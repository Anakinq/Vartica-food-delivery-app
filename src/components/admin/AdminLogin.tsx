import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ArrowLeft, Shield, Key } from 'lucide-react';

interface AdminLoginProps {
    onBack: () => void;
    onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBack, onLoginSuccess }) => {
    const { signIn } = useAuth();
    const { showToast } = useToast();
    const [email, setEmail] = useState('admin@vartica.edu');
    const [password, setPassword] = useState('Admin2024!');
    const [loading, setLoading] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await signIn(email, password);
            showToast('Admin login successful!', 'success');
            onLoginSuccess();
        } catch (error: any) {
            console.error('Admin login error:', error);
            showToast(`Login failed: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
                        <p className="text-gray-300">Secure administrative login</p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="admin@vartica.edu"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showCredentials ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCredentials(!showCredentials)}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                                >
                                    <Key className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex items-center text-gray-300 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 transition-all"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                                        Logging in...
                                    </span>
                                ) : (
                                    'Login as Admin'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <div className="flex items-start">
                            <Shield className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                            <div>
                                <h3 className="text-blue-300 font-medium mb-1">Admin Credentials</h3>
                                <p className="text-blue-200 text-sm">
                                    This is a dedicated admin login page for quick access to administrative functions.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};