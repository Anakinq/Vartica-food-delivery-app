/**
 * Authentication debugger utility
 * Helps diagnose login and profile issues for specific accounts
 */

import { supabase } from '../lib/supabase/client';

interface AuthDebugResult {
    step: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    details?: any;
}

/**
 * Debug a specific user account login
 * Tests authentication and profile retrieval
 */
export async function debugUserLogin(
    email: string,
    password: string
): Promise<AuthDebugResult[]> {
    const results: AuthDebugResult[] = [];

    // Step 1: Test credentials
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            results.push({
                step: '1. Authentication',
                status: 'error',
                message: `Login failed: ${error.message}`,
                details: {
                    code: error.status,
                    hint: 'Check email/password or verify account exists in Supabase Auth'
                }
            });
            return results;
        }

        if (!data.user) {
            results.push({
                step: '1. Authentication',
                status: 'error',
                message: 'Login succeeded but no user data returned',
            });
            return results;
        }

        results.push({
            step: '1. Authentication',
            status: 'success',
            message: 'User authenticated successfully',
            details: {
                userId: data.user.id,
                email: data.user.email,
            }
        });

        // Step 2: Check profile existence
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

        if (profileError) {
            results.push({
                step: '2. Profile Lookup',
                status: 'error',
                message: `Failed to fetch profile: ${profileError.message}`,
                details: profileError
            });
        } else if (!profile) {
            results.push({
                step: '2. Profile Lookup',
                status: 'error',
                message: 'User authenticated but NO PROFILE EXISTS in profiles table',
                details: {
                    userId: data.user.id,
                    solution: 'Create profile record in Supabase database manually or via signup'
                }
            });
        } else {
            results.push({
                step: '2. Profile Lookup',
                status: 'success',
                message: 'Profile found',
                details: {
                    id: profile.id,
                    email: profile.email,
                    fullName: profile.full_name,
                    role: profile.role,
                    phone: profile.phone,
                    createdAt: profile.created_at
                }
            });

            // Step 3: Check role-specific records
            if (profile.role === 'delivery_agent') {
                const { data: agent, error: agentError } = await supabase
                    .from('delivery_agents')
                    .select('*')
                    .eq('user_id', data.user.id)
                    .maybeSingle();

                if (agentError) {
                    results.push({
                        step: '3. Delivery Agent Record',
                        status: 'error',
                        message: `Failed to fetch delivery agent record: ${agentError.message}`,
                    });
                } else if (!agent) {
                    results.push({
                        step: '3. Delivery Agent Record',
                        status: 'warning',
                        message: 'NO delivery_agents record found',
                        details: {
                            solution: 'Insert record in delivery_agents table with user_id'
                        }
                    });
                } else {
                    results.push({
                        step: '3. Delivery Agent Record',
                        status: 'success',
                        message: 'Delivery agent record found',
                        details: {
                            id: agent.id,
                            vehicleType: agent.vehicle_type,
                            isAvailable: agent.is_available,
                            activeOrders: agent.active_orders_count,
                            totalDeliveries: agent.total_deliveries,
                            rating: agent.rating
                        }
                    });
                }
            }
        }

        // Clean up - sign out after debugging
        await supabase.auth.signOut();

    } catch (err) {
        results.push({
            step: 'Unknown',
            status: 'error',
            message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
        });
    }

    return results;
}

/**
 * Check if a user exists in auth.users (via admin API)
 * Note: This requires service_role key, so it won't work from client
 */
export async function checkUserExists(email: string): Promise<boolean> {
    try {
        // Try to sign in with a dummy password to check if user exists
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: 'dummy-password-to-check-existence',
        });

        // If error is "Invalid login credentials", user exists but password wrong
        // If error is "Email not confirmed", user exists
        if (error) {
            return error.message.includes('Invalid login') ||
                error.message.includes('Email not confirmed');
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Print debug results to console
 */
export function printAuthDebug(results: AuthDebugResult[]): void {
    console.log('\n🔐 AUTHENTICATION DEBUG REPORT\n');
    console.log('═'.repeat(60));

    results.forEach((result) => {
        const icon = result.status === 'success' ? '✅' :
            result.status === 'error' ? '❌' : '⚠️';

        console.log(`\n${icon} ${result.step}`);
        console.log(`   Status: ${result.status.toUpperCase()}`);
        console.log(`   ${result.message}`);

        if (result.details) {
            console.log('   Details:', result.details);
        }
    });

    console.log('\n' + '═'.repeat(60));

    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
        console.log('\n❌ LOGIN FAILED - See errors above\n');
    } else {
        console.log('\n✅ LOGIN SUCCESSFUL\n');
    }
}
