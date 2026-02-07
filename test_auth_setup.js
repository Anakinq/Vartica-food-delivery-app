// Diagnostic script to test authentication setup
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Checking Supabase configuration...');

if (!supabaseUrl || supabaseUrl.includes('your_project')) {
    console.error('❌ VITE_SUPABASE_URL is not configured properly in your .env file');
    console.log('👉 Please update your .env file with your actual Supabase project URL from your Supabase dashboard');
    process.exit(1);
}

if (!supabaseAnonKey || supabaseAnonKey.includes('your_anon')) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is not configured properly in your .env file');
    console.log('👉 Please update your .env file with your actual Supabase anon key from your Supabase dashboard');
    process.exit(1);
}

console.log('✅ Supabase URL configured');
console.log('✅ Supabase anon key configured');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
    console.log('\n🧪 Running authentication tests...\n');

    // Test 1: Check if we can connect to Supabase
    console.log('Test 1: Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            console.error('❌ Connection test failed:', error.message);
            console.log('💡 This might be because the profiles table doesn\'t exist yet or RLS policies are too restrictive');
        } else {
            console.log('✅ Successfully connected to Supabase and accessed profiles table');
        }
    } catch (err) {
        console.error('❌ Connection test threw an error:', err.message);
    }

    // Test 2: Test auth signup functionality
    console.log('\nTest 2: Testing auth signup functionality...');
    const testEmail = `test-${Date.now()}@example.com`;
    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: 'TempPass123!',
            options: {
                data: {
                    full_name: 'Test User',
                    role: 'customer'
                }
            }
        });

        if (error) {
            console.log(`⚠️  Signup encountered an error (this is expected for test emails):`, error.message);
            console.log('💡 This is often because the email is not confirmed or other auth restrictions');
        } else {
            console.log('✅ Signup request successful');
            if (data.user) {
                console.log('   User created with ID:', data.user.id);
            }
            if (data.session) {
                console.log('   Session created successfully');
            }
        }
    } catch (err) {
        console.log(`⚠️  Signup test threw an error (this is normal for test emails):`, err.message);
    }

    // Test 3: Check if auth trigger exists
    console.log('\nTest 3: Checking if auth trigger exists...');
    try {
        const { data, error } = await supabase
            .rpc('information_schema._pg_expandarray', {
                arr: []
            })
            .limit(1);

        // This is a simpler way to check trigger existence
        const { data: triggerCheck, error: triggerError } = await supabase
            .from('information_schema.triggers')
            .select('*')
            .ilike('trigger_name', '%auth_user%');

        if (triggerError) {
            console.log('⚠️  Could not check triggers directly:', triggerError.message);
        } else {
            if (triggerCheck && triggerCheck.length > 0) {
                console.log('✅ Found authentication-related triggers in database');
            } else {
                console.log('⚠️  No authentication triggers found - this may indicate the database setup is incomplete');
                console.log('💡 Run the fix_auth_setup.sql script in your Supabase SQL editor to set up the triggers');
            }
        }
    } catch (err) {
        console.log('⚠️  Could not check triggers:', err.message);
    }

    // Test 4: Check if the handle_new_user function exists
    console.log('\nTest 4: Checking if handle_new_user function exists...');
    try {
        const { data: funcCheck, error: funcError } = await supabase
            .from('information_schema.routines')
            .select('*')
            .eq('routine_name', 'handle_new_user')
            .eq('routine_schema', 'public');

        if (funcError) {
            console.log('⚠️  Could not check functions directly:', funcError.message);
        } else {
            if (funcCheck && funcCheck.length > 0) {
                console.log('✅ Found handle_new_user function in database');
            } else {
                console.log('⚠️  handle_new_user function not found - this is critical for authentication');
                console.log('💡 Run the fix_auth_setup.sql script in your Supabase SQL editor to create this function');
            }
        }
    } catch (err) {
        console.log('⚠️  Could not check functions:', err.message);
    }

    console.log('\n📋 Summary:');
    console.log('- Make sure your .env file has the correct Supabase URL and anon key');
    console.log('- Run the fix_auth_setup.sql script in your Supabase dashboard SQL editor');
    console.log('- Ensure your Supabase project has email authentication enabled');
    console.log('- Check that the profiles, vendors, and delivery_agents tables exist');
    console.log('\n💡 Tip: Copy the contents of fix_auth_setup.sql and run it in your Supabase SQL editor');
}

// Run the tests
runTests().catch(console.error);