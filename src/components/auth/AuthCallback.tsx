import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
    useEffect(() => {
        // Check for role in URL query parameters (from Google OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get('role');

        // Store the role in localStorage so it can be used during profile creation
        if (role && typeof window !== 'undefined' && window.localStorage) {
            try {
                window.localStorage.setItem('oauth_role', role);
            } catch (error) {
                console.warn('Failed to store role in localStorage:', error);
            }
        }

        // The Supabase client is configured with detectSessionInUrl: true
        // which should automatically handle the session from the URL
        // and trigger the auth state change event

        // We just need to ensure the page stays on this component
        // while the AuthContext processes the session

        // Optional: Add a timeout to redirect if auth state change doesn't occur
        const timer = setTimeout(() => {
            // If still on this page after 5 seconds, redirect to home without hash
            window.location.href = window.location.origin;
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Signing you in…</p>
        </div>
    );
}