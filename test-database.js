import { createClient } from '@supabase/supabase-js';

// Test if the database columns exist
const supabase = createClient(
    'https://jbqhbuogmxqzotlorahn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5NzY0OCwiZXhwIjoyMDc0OTczNjQ4fQ.PxrzHpwRJaOK6e4YQIDwnsWZeS_VeHdkhgOqmaKr9ZY'
);

async function testDatabase() {
    try {
        // Test if we can query the tables
        const { data, error } = await supabase
            .from('agent_payout_profiles')
            .select('id')
            .limit(1);

        if (error) {
            console.log('Error querying agent_payout_profiles:', error.message);
        } else {
            console.log('✓ Can query agent_payout_profiles table');
        }

        // Test withdrawals table
        const { data: wdData, error: wdError } = await supabase
            .from('withdrawals')
            .select('id')
            .limit(1);

        if (wdError) {
            console.log('Error querying withdrawals:', wdError.message);
        } else {
            console.log('✓ Can query withdrawals table');
        }

        // Try to add a test record to see if columns exist
        const testProfile = {
            user_id: 'test-user-id',
            account_number: '0123456789',
            account_name: 'Test User',
            bank_code: '058',
            verified: true
        };

        const { data: insertData, error: insertError } = await supabase
            .from('agent_payout_profiles')
            .insert(testProfile)
            .select();

        if (insertError) {
            console.log('Error inserting test profile:', insertError.message);
        } else {
            console.log('✓ Successfully inserted test profile');
            console.log('Test profile ID:', insertData[0].id);

            // Clean up
            await supabase
                .from('agent_payout_profiles')
                .delete()
                .eq('id', insertData[0].id);
            console.log('✓ Cleaned up test profile');
        }

    } catch (error) {
        console.error('Database test error:', error);
    }
}

testDatabase();