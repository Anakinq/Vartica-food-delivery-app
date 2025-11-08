/**
 * Test component to verify Supabase authentication and profile fetching
 * 
 * Usage: Import this component anywhere in your app to test the setup
 * 
 * Example in App.tsx:
 * import { SupabaseTest } from './components/SupabaseTest';
 * 
 * // Then in your component:
 * <SupabaseTest />
 */

import { useState } from 'react';
import { fetchCurrentUserProfile, runSupabaseDiagnostics, printDiagnostics } from '../utils';
import type { Profile } from '../lib/supabase';

export function SupabaseTest() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFetchProfile = async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await fetchCurrentUserProfile();

        if (fetchError) {
            setError(fetchError.message);
            console.error('❌ Error:', fetchError);
        } else {
            setProfile(data);
            console.log('✅ Profile:', data);
        }

        setLoading(false);
    };

    const handleRunDiagnostics = async () => {
        setLoading(true);
        const results = await runSupabaseDiagnostics();
        printDiagnostics(results);
        setLoading(false);
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '20px',
            background: '#1a1a1a',
            color: 'white',
            borderRadius: '8px',
            border: '2px solid #333',
            maxWidth: '400px',
            zIndex: 9999,
            fontFamily: 'monospace',
            fontSize: '12px'
        }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#00ff88' }}>
                🔧 Supabase Test Panel
            </h3>

            <div style={{ marginBottom: '15px' }}>
                <button
                    onClick={handleFetchProfile}
                    disabled={loading}
                    style={{
                        padding: '8px 12px',
                        marginRight: '8px',
                        background: '#0066ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                    }}
                >
                    {loading ? '⏳ Loading...' : '🔍 Fetch Profile'}
                </button>

                <button
                    onClick={handleRunDiagnostics}
                    disabled={loading}
                    style={{
                        padding: '8px 12px',
                        background: '#ff6600',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                    }}
                >
                    {loading ? '⏳ Running...' : '🔬 Run Diagnostics'}
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '10px',
                    background: '#ff4444',
                    borderRadius: '4px',
                    marginBottom: '10px'
                }}>
                    <strong>❌ Error:</strong><br />
                    {error}
                </div>
            )}

            {profile && (
                <div style={{
                    padding: '10px',
                    background: '#004400',
                    borderRadius: '4px',
                    border: '1px solid #00ff88'
                }}>
                    <strong style={{ color: '#00ff88' }}>✅ Profile Loaded:</strong><br />
                    <div style={{ marginTop: '8px', lineHeight: '1.5' }}>
                        <div><strong>ID:</strong> {profile.id.slice(0, 8)}...</div>
                        <div><strong>Email:</strong> {profile.email}</div>
                        <div><strong>Name:</strong> {profile.full_name}</div>
                        <div><strong>Role:</strong> {profile.role}</div>
                        {profile.phone && <div><strong>Phone:</strong> {profile.phone}</div>}
                    </div>
                </div>
            )}

            <div style={{ marginTop: '10px', fontSize: '10px', color: '#888' }}>
                💡 Tip: Check browser console for detailed logs
            </div>
        </div>
    );
}
