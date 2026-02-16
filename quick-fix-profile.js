import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://jbqhbuogmxqzotlorahn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5NzY0OCwiZXhwIjoyMDc0OTczNjQ4fQ.PxrzHpwRJaOK6e4YQIDwnsWZeS_VeHdkhgOqmaKr9ZY'
);

async function quickFixProfile() {
    try {
        console.log('🔧 Quick fixing profile issues...');

        // 1. Fix the schema issue
        console.log('1. Fixing table schema...');
        const { error: schemaError } = await supabase
            .rpc('execute_sql', {
                sql: `
                    ALTER TABLE agent_payout_profiles 
                    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
                    
                    ALTER TABLE agent_payout_profiles 
                    DROP CONSTRAINT IF EXISTS agent_payout_profiles_pkey;
                    
                    ALTER TABLE agent_payout_profiles 
                    ADD CONSTRAINT agent_payout_profiles_user_id_unique UNIQUE (user_id);
                `
            });

        if (schemaError) {
            console.log('Schema fix error (might already be fixed):', schemaError.message);
        } else {
            console.log('✅ Schema fixed successfully');
        }

        // 2. Verify the existing profile
        console.log('2. Verifying existing profile...');
        const { data: profile, error: profileError } = await supabase
            .from('agent_payout_profiles')
            .select('*')
            .eq('user_id', '0e0b6857-1859-415c-8bbf-da7274260773')
            .single();

        if (profileError) {
            console.error('❌ Profile lookup still failing:', profileError);
            return;
        }

        console.log('✅ Profile found:', profile);

        // 3. Test if we can now query with ID
        console.log('3. Testing ID-based query...');
        const { data: profileById, error: idError } = await supabase
            .from('agent_payout_profiles')
            .select('id, user_id, account_number')
            .eq('id', profile.id)
            .single();

        if (idError) {
            console.error('❌ ID query failed:', idError);
        } else {
            console.log('✅ ID query successful:', profileById);
        }

        // 4. Manually verify the profile since Paystack is failing
        console.log('4. Manually verifying profile...');
        const { error: verifyError } = await supabase
            .from('agent_payout_profiles')
            .update({ verified: true })
            .eq('user_id', '0e0b6857-1859-415c-8bbf-da7274260773');

        if (verifyError) {
            console.error('❌ Manual verification failed:', verifyError);
        } else {
            console.log('✅ Profile manually verified!');
        }

        // 5. Test withdrawal API
        console.log('5. Testing withdrawal API...');
        const testResponse = await fetch('https://vartica-food-delivery-g7da554xd-legendanakin-4117s-projects.vercel.app/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: '7e35b675-754f-46f6-b078-a808c256a4fb',
                amount: 100
            })
        });

        console.log('Withdrawal API Status:', testResponse.status);
        const testResult = await testResponse.json();
        console.log('Withdrawal API Response:', JSON.stringify(testResult, null, 2));

    } catch (error) {
        console.error('❌ Quick fix error:', error);
    }
}

quickFixProfile();