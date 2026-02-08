import React, { useEffect, useRef } from 'react';

export default function AuthCallback() {
    const redirectAttempted = useRef(false);

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
        // and trigger the auth state change event in AuthContext

        // Clear the hash to remove OAuth parameters from URL and trigger auth-based routing
        const performRedirect = () => {
            if (redirectAttempted.current) return;
            redirectAttempted.current = true;

            console.log('OAuth callback completed - clearing hash to trigger auth-based routing');

            // Clear the hash completely and let App.tsx handle routing based on auth state
            // Using replaceState to avoid adding to browser history stack
            window.history.replaceState(null, '', window.location.pathname);

            // Set empty hash to trigger App.tsx's role-based routing
            window.location.hash = '';
        };

        // Redirect after a short delay to allow auth state to be processed
        // Supabase's onAuthStateChange should have already processed the session
        const timer = setTimeout(() => {
            performRedirect();
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing your sign in…</p>
            </div>
        </div>
    );
}