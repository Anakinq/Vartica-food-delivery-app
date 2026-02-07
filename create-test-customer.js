// Create a test customer account
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

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