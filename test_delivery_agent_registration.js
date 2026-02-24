// Test script to check delivery agent registration functionality
// Run this with: node test_delivery_agent_registration.js

import { createClient } from '@supabase/supabase-js';

// Get your Supabase credentials from environment variables or .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDeliveryAgentRegistration() {
    console.log('🚀 Testing Delivery Agent Registration Functionality...\n');

    try {
        // 1. Test if we can connect to Supabase
        console.log('1. Testing database connection...');
        const { data: test, error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (testError) {
            console.error('❌ Database connection failed:', testError.message);
            return;
        }
        console.log('✅ Database connection successful\n');

        // 2. Check if the function exists
        console.log('2. Checking if add_delivery_agent_role function exists...');
        const { data: functions, error: funcError } = await supabase
            .rpc('check_function_exists', { function_name: 'add_delivery_agent_role' })
            .catch(() => {
                // If the check function doesn't exist, we'll test directly
                return { data: null, error: null };
            });

        // Alternative check - try to call the function with a fake user ID
        try {
            const { data: result, error: callError } = await supabase
                .rpc('add_delivery_agent_role', {
                    user_id: '00000000-0000-0000-0000-000000000000',
                    vehicle_type: 'Foot'
                });

            if (callError && callError.message.includes('function "add_delivery_agent_role" does not exist')) {
                console.error('❌ Function does not exist. You need to run the database migration.');
                console.log('   Run the SQL file: supabase/migrations/fix_delivery_agent_registration.sql');
                return;
            } else if (callError && callError.message.includes('invalid input syntax for type uuid')) {
                console.log('✅ Function exists (got expected UUID error)');
            } else {
                console.log('✅ Function exists and is callable');
            }
        } catch (e) {
            console.error('❌ Error calling function:', e.message);
            return;
        }

        // 3. Check required tables
        console.log('\n3. Checking required database tables...');
        const tablesToCheck = ['delivery_agents', 'agent_wallets', 'profiles'];
        for (const table of tablesToCheck) {
            const { data: tableData, error: tableError } = await supabase
                .from(table)
                .select('id')
                .limit(1);

            if (tableError) {
                console.error(`❌ Table ${table} error:`, tableError.message);
            } else {
                console.log(`✅ Table ${table} exists`);
            }
        }

        // 4. Check required columns
        console.log('\n4. Checking required columns...');
        const columnChecks = [
            { table: 'profiles', columns: ['is_delivery_agent', 'role'] },
            { table: 'delivery_agents', columns: ['user_id', 'vehicle_type', 'is_available', 'is_foot_delivery'] }
        ];

        for (const check of columnChecks) {
            const { data: columns, error: columnError } = await supabase
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_name', check.table)
                .in('column_name', check.columns);

            if (columnError) {
                console.error(`❌ Error checking columns in ${check.table}:`, columnError.message);
            } else {
                const existingColumns = columns.map(c => c.column_name);
                const missingColumns = check.columns.filter(col => !existingColumns.includes(col));

                if (missingColumns.length === 0) {
                    console.log(`✅ All required columns exist in ${check.table}`);
                } else {
                    console.error(`❌ Missing columns in ${check.table}:`, missingColumns.join(', '));
                }
            }
        }

        console.log('\n🎉 Test completed! Check the results above for any issues.');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Make sure your Supabase credentials are correct');
        console.log('2. Check if you have network access to your Supabase instance');
        console.log('3. Verify the database migrations have been applied');
        console.log('4. Run the test SQL script in your Supabase dashboard');
    }
}

// Run the test
testDeliveryAgentRegistration();