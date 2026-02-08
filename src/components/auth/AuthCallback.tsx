import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthCallback() {
    const redirectAttempted = useRef(false);
    const { user, profile, loading } = useAuth();
    const [redirectComplete, setRedirectComplete] = useState(false);

    useEffect(() => {
        // Check for role in URL query parameters (from Google OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        const role = urlParams.get('role');
        const phone = urlParams.get('phone');

        // Also check hash parameters for compatibility
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashRole = hashParams.get('role') || role;
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

        // Clear the pending flag since we're processing
        sessionStorage.removeItem('oauth_redirect_pending');
    }, []);

    // Perform redirect when auth state is ready
    useEffect(() => {
        if (redirectComplete || redirectAttempted.current) return;

        // Wait for auth to be fully loaded
        if (loading) {
            console.log('AuthCallback: Still loading auth state...');
            return;
        }

        // Check if user is now authenticated
        if (user && profile) {
            console.log('AuthCallback: User authenticated, performing redirect');
            redirectAttempted.current = true;

            // Clear the hash completely and let App.tsx handle routing based on auth state
            window.history.replaceState(null, '', window.location.pathname);

            // Set empty hash to trigger App.tsx's role-based routing
            window.location.hash = '';

            setRedirectComplete(true);
        } else if (user && !profile) {
            // User exists but profile is still loading - wait a bit
            console.log('AuthCallback: User exists, waiting for profile...');
        } else if (!user && !loading) {
            // No user after loading - OAuth might have failed
            console.log('AuthCallback: No user after loading - redirecting to landing');
            redirectAttempted.current = true;
            window.history.replaceState(null, '', window.location.pathname);
            window.location.hash = '#/';
            setRedirectComplete(true);
        }
    }, [user, profile, loading, redirectComplete]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Completing your sign in…</p>
                <p className="text-sm text-gray-400 mt-2">Please wait while we verify your account</p>
            </div>
        </div>
    );
}