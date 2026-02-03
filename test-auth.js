// Simple test script to check authentication
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbqhbuogmxqzotlorahn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTc2NDgsImV4cCI6MjA3NDk3MzY0OH0.APsgWNwZnGnBZpBZTGqL61O3pPLKu4eDmfpsFvk2XMQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
    console.log('Testing Supabase authentication...');

    try {
        // Test if we can connect to Supabase
        const { data, error } = await supabase.from('profiles').select('id').limit(1);

        if (error) {
            console.error('Error connecting to Supabase:', error);
        } else {
            console.log('Successfully connected to Supabase');
            console.log('Profiles table accessible');
        }

        // Test signup
        console.log('Testing signup...');
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: 'testuser@example.com',
            password: 'Password123!',
            options: {
                data: {
                    full_name: 'Test User',
                    role: 'customer'
                }
            }
        });

        if (signupError) {
            console.error('Signup error:', signupError);
        } else {
            console.log('Signup successful:', signupData);
        }

        // Test signin
        console.log('Testing signin...');
        const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
            email: 'testuser@example.com',
            password: 'Password123!'
        });

        if (signinError) {
            console.error('Signin error:', signinError);
        } else {
            console.log('Signin successful:', signinData);
        }

    } catch (err) {
        console.error('Test error:', err);
    }
}

testAuth();