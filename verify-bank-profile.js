import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://jbqhbuogmxqzotlorahn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5NzY0OCwiZXhwIjoyMDc0OTczNjQ4fQ.PxrzHpwRJaOK6e4YQIDwnsWZeS_VeHdkhgOqmaKr9ZY'
);

async function verifyBankProfile() {
    try {
        console.log('🔍 Checking bank profile verification status...');

        // Check the specific profile
        const { data: profile, error } = await supabase
            .from('agent_payout_profiles')
            .select('*')
            .eq('user_id', '0e0b6857-1859-415c-8bbf-da7274260773')
            .single();

        if (error) {
            console.error('❌ Error fetching profile:', error);
            return;
        }

        console.log('📋 Current profile status:');
        console.log('- User ID:', profile.user_id);
        console.log('- Account Number:', profile.account_number);
        console.log('- Bank Code:', profile.bank_code);
        console.log('- Account Name:', profile.account_name);
        console.log('- Verified:', profile.verified);
        console.log('- Recipient Code:', profile.recipient_code);

        if (!profile.verified) {
            console.log('\n🔧 Verifying the profile...');

            const { error: updateError } = await supabase
                .from('agent_payout_profiles')
                .update({ verified: true })
                .eq('user_id', '0e0b6857-1859-415c-8bbf-da7274260773');

            if (updateError) {
                console.error('❌ Error updating profile:', updateError);
            } else {
                console.log('✅ Profile verified successfully!');

                // Test withdrawal
                console.log('\n🧪 Testing withdrawal API...');
                const testResponse = await fetch('https://vartica-food-delivery-siymixx1b-legendanakin-4117s-projects.vercel.app/api/withdraw', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        agent_id: '7e35b675-754f-46f6-b078-a808c256a4fb', // You'll need to get the actual agent ID
                        amount: 100
                    })
                });

                const testResult = await testResponse.json();
                console.log('Withdrawal test result:', testResult);
            }
        } else {
            console.log('✅ Profile is already verified!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

verifyBankProfile();