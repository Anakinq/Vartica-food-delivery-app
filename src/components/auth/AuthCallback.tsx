import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
    const { refreshProfile } = useAuth();

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Get the current session
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error);
                    window.location.href = '/#/signin';
                    return;
                }

                if (data.session) {
                    // Refresh the profile to ensure we have the latest user data
                    await refreshProfile();

                    // Check if we have a stored role from the OAuth signup process
                    const oauthRole = localStorage.getItem('oauth_role');
                    if (oauthRole) {
                        // Clear the stored role
                        localStorage.removeItem('oauth_role');

                        // Redirect to the appropriate dashboard based on role
                        switch (oauthRole) {
                            case 'customer':
                                window.location.href = '/#/customer';
                                break;
                            case 'vendor':
                                window.location.href = '/#/vendor';
                                break;
                            case 'delivery_agent':
                                window.location.href = '/#/delivery';
                                break;
                            default:
                                window.location.href = '/';
                        }
                    } else {
                        // For sign-in, redirect to home
                        window.location.href = '/';
                    }
                } else {
                    window.location.href = '/#/signin';
                }
            } catch (err) {
                console.error('Error during OAuth callback:', err);
                window.location.href = '/#/signin';
            }
        };

        handleOAuthCallback();
    }, [refreshProfile]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing authentication...</h2>
                <p className="text-gray-600">Please wait while we set up your account</p>
            </div>
        </div>
    );
};

export default AuthCallback;