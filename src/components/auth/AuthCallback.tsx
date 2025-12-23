import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
    useEffect(() => {
        const finalizeAuth = async () => {
            // This consumes the tokens AND persists the session
            await supabase.auth.getSession();
            // DO NOT redirect manually
            // Let AuthContext react to auth state change
        };

        finalizeAuth();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Signing you in…</p>
        </div>
    );
}