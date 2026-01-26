/**
 * Production-ready profile fetching utility
 * Handles authentication, RLS, and error cases
 */

import { supabase } from '../lib/supabase/client';
import type { Profile } from '../lib/supabase/types';

interface ProfileResult {
    data: Profile | null;
    error: { message: string; code?: string } | null;
}

/**
 * Fetches the profile for the currently authenticated user
 * Ensures proper authentication before querying
 * 
 * @returns Promise with profile data or error
 * 
 * @example
 * ```typescript
 * const { data, error } = await fetchCurrentUserProfile();
 * if (error) {
 *   console.error('Failed:', error.message);
 *   return;
 * }
 * console.log('Profile:', data);
 * ```
 */
export async function fetchCurrentUserProfile(): Promise<ProfileResult> {
    try {
        // Step 1: Verify user authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('❌ Session error:', sessionError.message);
            return { data: null, error: sessionError };
        }

        if (!session) {
            console.error('❌ No active session - user must sign in first');
            return {
                data: null,
                error: { message: 'Not authenticated. Please sign in.' }
            };
        }

        console.log('✅ User authenticated:', session.user.id);

        // Step 2: Fetch profile using Supabase client
        // The JWT token is automatically included in the request headers
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

        if (error) {
            console.error('❌ Profile fetch error:', error.message);
            return { data: null, error };
        }

        if (!data) {
            console.warn('⚠️ No profile found for user');
            return {
                data: null,
                error: { message: 'Profile not found. Please complete signup.' }
            };
        }

        console.log('✅ Profile fetched successfully');
        return { data, error: null };

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('❌ Unexpected error:', errorMessage);
        return {
            data: null,
            error: { message: errorMessage }
        };
    }
}

/**
 * Check if user is authenticated without fetching profile
 * Useful for quick auth checks
 */
export async function isUserAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
}

/**
 * Get current user's ID if authenticated
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user.id ?? null;
}
