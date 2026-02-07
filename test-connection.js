// Test script to verify Supabase connection and auth functionality
import { createClient } from '@supabase/supabase-js';

// Configuration from your environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    console.log('Testing Supabase connection...');

    try {
        // Test basic connection
        const { data, error } = await supabase.from('profiles').select('id').limit(1);

        if (error) {
            console.error('Database connection error:', error);
        } else {
            console.log('Database connection successful');
        }

        // Test auth signup
        console.log('Testing auth signup...');
        const testEmail = `test-${Date.now()}@example.com`;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: testEmail,
            password: 'Password123!@#',
            options: {
                data: {
                    full_name: 'Test User',
                    role: 'customer'
                }
            }
        });

        if (authError) {
            console.error('Auth signup error:', authError);
        } else {
            console.log('Auth signup successful:', authData);
        }

    } catch (err) {
        console.error('Connection test failed:', err);
    }
}

testConnection();