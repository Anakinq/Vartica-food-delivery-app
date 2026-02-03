// Create a test customer account
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbqhbuogmxqzotlorahn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTc2NDgsImV4cCI6MjA3NDk3MzY0OH0.APsgWNwZnGnBZpBZTGqL61O3pPLKu4eDmfpsFvk2XMQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestCustomer() {
    console.log('Creating test customer account...');

    try {
        // Sign up a new customer
        const { data, error } = await supabase.auth.signUp({
            email: 'customer@test.com',
            password: 'TestPassword123!',
            options: {
                data: {
                    full_name: 'Test Customer',
                    role: 'customer'
                }
            }
        });

        if (error) {
            console.error('Signup error:', error);
            return;
        }

        console.log('Signup successful!');
        console.log('User ID:', data.user?.id);
        console.log('Email:', data.user?.email);

        // Create profile record
        if (data.user) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: 'Test Customer',
                    role: 'customer'
                })
                .select();

            if (profileError) {
                console.error('Profile creation error:', profileError);
            } else {
                console.log('Profile created successfully:', profileData);
            }
        }

        console.log('\nTest account created successfully!');
        console.log('Email: customer@test.com');
        console.log('Password: TestPassword123!');
        console.log('Role: customer');

    } catch (err) {
        console.error('Error:', err);
    }
}

createTestCustomer();