import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://jbqhbuogmxqzotlorahn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5NzY0OCwiZXhwIjoyMDc0OTczNjQ4fQ.PxrzHpwRJaOK6e4YQIDwnsWZeS_VeHdkhgOqmaKr9ZY'
);

async function debugAgentLookup() {
    try {
        console.log('🔍 Debugging agent lookup issues...');
        
        // Test 1: Check if the agent exists
        console.log('\n1. Checking delivery agent:');
        const { data: agent, error: agentError } = await supabase
            .from('delivery_agents')
            .select('*')
            .eq('id', '7e35b675-754f-46f6-b078-a808c256a4fb')
            .single();

        if (agentError) {
            console.error('❌ Agent lookup error:', agentError);
        } else {
            console.log('✅ Agent found:', {
                id: agent.id,
                user_id: agent.user_id,
                is_approved: agent.is_approved
            });
        }

        // Test 2: Check if user exists
        console.log('\n2. Checking user:');
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', '0e0b6857-1859-415c-8bbf-da7274260773')
            .single();

        if (userError) {
            console.error('❌ User lookup error:', userError);
        } else {
            console.log('✅ User found:', {
                id: user.id,
                email: user.email,
                role: user.role
            });
        }

        // Test 3: Check payout profile
        console.log('\n3. Checking payout profile:');
        const { data: profile, error: profileError } = await supabase
            .from('agent_payout_profiles')
            .select('*')
            .eq('user_id', '0e0b6857-1859-415c-8bbf-da7274260773')
            .single();

        if (profileError) {
            console.error('❌ Profile lookup error:', profileError);
        } else {
            console.log('✅ Profile found:', {
                user_id: profile.user_id,
                account_number: profile.account_number,
                bank_code: profile.bank_code,
                verified: profile.verified
            });
        }

        // Test 4: Test the actual API calls that are failing
        console.log('\n4. Testing API calls:');
        
        // Test verify-bank-account API
        console.log('Testing verify-bank-account API...');
        const verifyResponse = await fetch('https://vartica-food-delivery-app.vercel.app/api/verify-bank-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: '7e35b675-754f-46f6-b078-a808c256a4fb',
                account_number: '1720060447',
                bank_code: '044'
            })
        });

        console.log('Verify API Status:', verifyResponse.status);
        if (verifyResponse.status !== 200) {
            const verifyError = await verifyResponse.text();
            console.log('Verify API Error:', verifyError);
        }

        // Test withdraw API
        console.log('Testing withdraw API...');
        const withdrawResponse = await fetch('https://vartica-food-delivery-app.vercel.app/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: '7e35b675-754f-46f6-b078-a808c256a4fb',
                amount: 100
            })
        });

        console.log('Withdraw API Status:', withdrawResponse.status);
        if (withdrawResponse.status !== 200) {
            const withdrawError = await withdrawResponse.text();
            console.log('Withdraw API Error:', withdrawError);
        }

    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

debugAgentLookup();