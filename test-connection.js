// Test script to verify Supabase connection and auth functionality
import { createClient } from '@supabase/supabase-js';

// Configuration from your environment
const supabaseUrl = 'https://jbqhbuogmxqzotlorahn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTc2NDgsImV4cCI6MjA3NDk3MzY0OH0.APsgWNwZnGnBZpBZTGqL61O3pPLKu4eDmfpsFvk2XMQ';

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