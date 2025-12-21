import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const AuthCallback: React.FC = () => {
    const { refreshProfile } = useAuth();

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                console.log('Starting OAuth callback handling...');

                // Get the current session
                const { data, error } = await supabase.auth.getSession();

                console.log('Session data:', data);
                console.log('Session error:', error);

                if (error) {
                    console.error('Error getting session:', error);
                    window.location.hash = '#/signin';
                    return;
                }

                if (data.session) {
                    console.log('Session found, refreshing profile...');
                    // Refresh the profile to ensure we have the latest user data
                    await refreshProfile();

                    // Check if we have a stored role from the OAuth signup process
                    const oauthRole = localStorage.getItem('oauth_role');
                    console.log('OAuth role from localStorage:', oauthRole);

                    if (oauthRole) {
                        // Clear the stored role
                        localStorage.removeItem('oauth_role');

                        // Redirect to the appropriate dashboard based on role
                        switch (oauthRole) {
                            case 'customer':
                                window.location.hash = '#/customer';
                                break;
                            case 'vendor':
                                window.location.hash = '#/vendor';
                                break;
                            case 'delivery_agent':
                                window.location.hash = '#/delivery';
                                break;
                            default:
                                window.location.hash = '';
                        }
                    } else {
                        // For sign-in, redirect to home (which will show the appropriate dashboard)
                        window.location.hash = '';
                    }
                } else {
                    console.log('No session found, redirecting to sign in');
                    // No session, redirect to sign in
                    window.location.hash = '#/signin';
                }
            } catch (err) {
                console.error('Error during OAuth callback:', err);
                window.location.hash = '#/signin';
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