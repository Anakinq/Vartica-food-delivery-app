import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
    useEffect(() => {
        const finishOAuth = async () => {
            try {
                // 🔥 THIS consumes the tokens from the URL and initializes the session
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('OAuth error:', error.message);
                    // Redirect to main page on error
                    window.location.replace('/');
                    return;
                }

                // Wait a bit to ensure session is properly initialized
                await new Promise(resolve => setTimeout(resolve, 500));

                // ✅ CLEAN the URL + force app reload to main page
                // This will trigger the AuthContext to pick up the session
                window.location.replace('/');
            } catch (err) {
                console.error('Error during OAuth completion:', err);
                window.location.replace('/');
            }
        };

        finishOAuth();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Completing sign-in…</p>
        </div>
    );
}