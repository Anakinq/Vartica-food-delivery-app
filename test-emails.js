// Test different email formats
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

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