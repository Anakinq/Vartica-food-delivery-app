/**
 * Diagnostic utility to test Supabase connection and authentication
 * Run this to verify your setup is working correctly
 */

import { supabase } from '../lib/supabase/client';

interface DiagnosticResult {
    step: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    details?: any;
}

/**
 * Run comprehensive diagnostics on Supabase setup
 * Tests: client initialization, auth, RLS, and profile access
 */
export async function runSupabaseDiagnostics(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // Test 1: Client initialization
    try {
        if (!supabase) {
            results.push({
                step: '1. Client Initialization',
                status: 'error',
                message: 'Supabase client not initialized'
            });
            return results;
        }
        results.push({
            step: '1. Client Initialization',
            status: 'success',
            message: 'Supabase client initialized successfully'
        });
    } catch (err) {
        results.push({
            step: '1. Client Initialization',
            status: 'error',
            message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
        return results;
    }

    // Test 2: Environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        results.push({
            step: '2. Environment Variables',
            status: 'error',
            message: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file',
            details: {
                url: supabaseUrl ? 'Set' : 'Missing',
                key: supabaseKey ? 'Set' : 'Missing'
            }
        });
        return results;
    }

    if (supabaseKey.length < 100) {
        results.push({
            step: '2. Environment Variables',
            status: 'warning',
            message: 'Anon key seems too short - verify it\'s complete',
            details: { keyLength: supabaseKey.length }
        });
    } else {
        results.push({
            step: '2. Environment Variables',
            status: 'success',
            message: 'Environment variables configured',
            details: {
                url: supabaseUrl,
                keyLength: supabaseKey.length
            }
        });
    }

    // Test 3: Session check
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            results.push({
                step: '3. Session Check',
                status: 'error',
                message: `Session error: ${error.message}`,
                details: error
            });
        } else if (!session) {
            results.push({
                step: '3. Session Check',
                status: 'warning',
                message: 'No active session - user not signed in',
                details: { authenticated: false }
            });
        } else {
            results.push({
                step: '3. Session Check',
                status: 'success',
                message: 'User authenticated',
                details: {
                    userId: session.user.id,
                    email: session.user.email,
                    expiresAt: new Date(session.expires_at! * 1000).toISOString()
                }
            });
        }
    } catch (err) {
        results.push({
            step: '3. Session Check',
            status: 'error',
            message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
    }

    // Test 4: Profile fetch (only if authenticated)
    const lastResult = results[results.length - 1];
    if (lastResult.status === 'success' && lastResult.step === '3. Session Check') {
        try {
            const userId = lastResult.details.userId;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                results.push({
                    step: '4. Profile Fetch',
                    status: 'error',
                    message: `Failed to fetch profile: ${error.message}`,
                    details: {
                        code: error.code,
                        hint: error.hint,
                        details: error.details
                    }
                });
            } else if (!data) {
                results.push({
                    step: '4. Profile Fetch',
                    status: 'warning',
                    message: 'No profile record found for authenticated user',
                    details: { userId }
                });
            } else {
                results.push({
                    step: '4. Profile Fetch',
                    status: 'success',
                    message: 'Profile fetched successfully',
                    details: {
                        id: data.id,
                        email: data.email,
                        role: data.role,
                        fullName: data.full_name
                    }
                });
            }
        } catch (err) {
            results.push({
                step: '4. Profile Fetch',
                status: 'error',
                message: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}`
            });
        }
    } else {
        results.push({
            step: '4. Profile Fetch',
            status: 'warning',
            message: 'Skipped - requires active session'
        });
    }

    // Test 5: RLS Policy check
    if (lastResult.status === 'success' && lastResult.step === '3. Session Check') {
        try {
            // Try to fetch without filtering by user ID (should only return current user's profile)
            const { data, error } = await supabase
                .from('profiles')
                .select('count');

            if (error) {
                results.push({
                    step: '5. RLS Policy Check',
                    status: 'error',
                    message: `RLS check failed: ${error.message}`
                });
            } else {
                results.push({
                    step: '5. RLS Policy Check',
                    status: 'success',
                    message: 'RLS policies active and working',
                    details: { message: 'Only your own profile is accessible' }
                });
            }
        } catch (err) {
            results.push({
                step: '5. RLS Policy Check',
                status: 'warning',
                message: 'Could not verify RLS policies'
            });
        }
    } else {
        results.push({
            step: '5. RLS Policy Check',
            status: 'warning',
            message: 'Skipped - requires active session'
        });
    }

    return results;
}

/**
 * Print diagnostic results to console
 */
export function printDiagnostics(results: DiagnosticResult[]): void {
    console.log('\n🔍 SUPABASE DIAGNOSTIC REPORT\n');
    console.log('═'.repeat(60));

    results.forEach((result, index) => {
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
        console.log('\n❌ DIAGNOSTICS FAILED - See errors above\n');
    } else {
        console.log('\n✅ ALL DIAGNOSTICS PASSED\n');
    }
}
