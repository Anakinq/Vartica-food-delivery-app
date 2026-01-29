import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        // Check for role in URL query parameters (from Google OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get('role');
        const phone = urlParams.get('phone');

        // Also check hash parameters for compatibility
        const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove '#' and parse
        const hashRole = hashParams.get('role') || role; // Use hash role if available, otherwise use query param
        const hashPhone = hashParams.get('phone') || phone;

        // Store the role in session storage so it can be used during profile creation
        if (hashRole && typeof window !== 'undefined' && window.sessionStorage) {
            try {
                window.sessionStorage.setItem('oauth_role', hashRole);
                if (hashPhone) {
                    window.sessionStorage.setItem('oauth_phone', hashPhone);
                }
                console.log('Stored OAuth role:', hashRole, 'phone:', hashPhone);
            } catch (error) {
                console.warn('Failed to store OAuth data in sessionStorage:', error);
            }
        }

        // The Supabase client is configured with detectSessionInUrl: true
        // which should automatically handle the session from the URL
        // and trigger the auth state change event

        // We just need to ensure the page stays on this component
        // while the AuthContext processes the session

        // Optional: Add a timeout to redirect if auth state change doesn't occur
        const timer = setTimeout(() => {
            console.log('OAuth callback timeout - redirecting to home');
            // Redirect based on role if available
            if (hashRole) {
                switch (hashRole) {
                    case 'vendor':
                        navigate('/vendor/dashboard');
                        break;
                    case 'delivery_agent':
                        navigate('/delivery');
                        break;
                    default:
                        navigate('/');
                }
            } else {
                navigate('/');
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing your sign in…</p>
            </div>
        </div>
    );
}