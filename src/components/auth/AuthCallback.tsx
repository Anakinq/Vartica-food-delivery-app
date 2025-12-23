import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
    useEffect(() => {
        const finishOAuth = async () => {
            // 🔥 THIS consumes the tokens from the URL
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error('OAuth error:', error.message);
                window.location.replace('/'); // fallback
                return;
            }

            if (data?.session) {
                // ✅ CLEAN the URL + force app reload
                window.location.replace('/');
            } else {
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