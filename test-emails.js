// Test different email formats
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbqhbuogmxqzotlorahn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTc2NDgsImV4cCI6MjA3NDk3MzY0OH0.APsgWNwZnGnBZpBZTGqL61O3pPLKu4eDmfpsFvk2XMQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailFormats() {
    const emailsToTest = [
        'test@localhost',
        'test@127.0.0.1',
        'user@gmail.com',
        'customer@vartica.local'
    ];

    console.log('Testing different email formats...\n');

    for (const email of emailsToTest) {
        console.log(`Testing: ${email}`);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: 'TestPassword123!',
                options: {
                    data: {
                        full_name: 'Test User',
                        role: 'customer'
                    }
                }
            });

            if (error) {
                console.log(`  ❌ Failed: ${error.message}`);
            } else {
                console.log(`  ✅ Success! User ID: ${data.user?.id}`);

                // Create profile
                if (data.user) {
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: data.user.id,
                            email: data.user.email,
                            full_name: 'Test User',
                            role: 'customer'
                        });

                    if (profileError) {
                        console.log(`  Profile creation error: ${profileError.message}`);
                    } else {
                        console.log('  Profile created successfully');
                    }
                }
                break; // Stop after first successful signup
            }
        } catch (err) {
            console.log(`  ❌ Exception: ${err.message}`);
        }
        console.log('');
    }
}

testEmailFormats();