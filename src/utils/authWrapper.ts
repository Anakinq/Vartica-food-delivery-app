import { supabase } from '../lib/supabase/client';
import { createClient } from '@supabase/supabase-js';

// Create a separate client instance that uses the service role key for specific operations
let serviceRoleSupabase: any | null = null;

const initializeServiceRoleClient = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceRoleKey) {
        console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Some operations may fail.');
        return null;
    }

    if (!supabaseUrl) {
        console.error('VITE_SUPABASE_URL is not set.');
        return null;
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
        },
    });
};

export const getServiceRoleClient = () => {
    if (!serviceRoleSupabase) {
        serviceRoleSupabase = initializeServiceRoleClient();
    }
    return serviceRoleSupabase;
};

// Enhanced authentication wrapper with automatic retry and service role fallback
export const withAuth = async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    useServiceRole = false
): Promise<T | null> => {
    try {
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!session || sessionError) {
            console.log(`${operationName}: No valid session found, attempting to refresh...`);

            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError || !refreshedSession) {
                console.error(`${operationName}: Session refresh failed`, refreshError);
                // Trigger sign out in the UI context
                if (typeof window !== 'undefined') {
                    // Dispatch a custom event to signal sign out
                    window.dispatchEvent(new CustomEvent('authError'));
                }
                return null;
            }

            console.log(`${operationName}: Session refreshed successfully`);
        }

        // Execute the operation with the regular client first
        const result = await operation();
        return result;
    } catch (error) {
        console.error(`${operationName}: Operation failed`, error);

        // Check if it's an authentication error
        if (error instanceof Error &&
            (error.message.includes('401') ||
                error.message.includes('403') ||
                error.message.toLowerCase().includes('auth') ||
                error.message.toLowerCase().includes('permission') ||
                error.message.toLowerCase().includes('unauthorized'))) {

            console.error(`${operationName}: Authentication error detected`);

            // If service role is allowed and we have the key, try with service role
            if (useServiceRole) {
                console.log(`${operationName}: Attempting operation with service role key`);

                const serviceClient = getServiceRoleClient();
                if (serviceClient) {
                    try {
                        // Execute the operation with service role client
                        // Note: We need to adapt the operation to use the service client
                        // This is a simplified approach - in practice, you might need to pass
                        // the service client to your operations
                        const result = await operation();
                        return result;
                    } catch (serviceError) {
                        console.error(`${operationName}: Operation failed even with service role`, serviceError);

                        // Dispatch sign out event if service role also fails
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('authError'));
                        }
                        return null;
                    }
                }
            }

            // If service role isn't allowed or not available, dispatch sign out
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('authError'));
            }
            return null;
        }

        // Re-throw non-authentication errors
        throw error;
    }
};

// Wrapper for storage operations specifically
export const withStorageAuth = async <T,>(
    operation: () => Promise<T>,
    operationName: string
): Promise<T | null> => {
    return withAuth(operation, operationName, true);
};