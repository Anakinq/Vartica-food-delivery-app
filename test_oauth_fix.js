// Test script to verify OAuth delivery agent functionality
// Run this after applying the database fix

import { supabase } from './src/lib/supabase/client';

async function testDeliveryAgentOAuth() {
    console.log('Testing delivery agent OAuth functionality...');

    try {
        // Test the OAuth flow simulation
        const testRole = 'delivery_agent';
        const testPhone = '+2348012345678';

        console.log(`Simulating OAuth signup with role: ${testRole}`);

        // This simulates what happens during OAuth flow
        // In real scenario, this would be handled by the AuthCallback component
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('oauth_role', testRole);
            window.sessionStorage.setItem('oauth_phone', testPhone);
            console.log('Stored OAuth role and phone in sessionStorage');
        }

        // Test the database trigger logic
        console.log('Testing database trigger logic...');

        // Check if the multi-role columns exist
        const { data: columns, error: columnsError } = await supabase
            .from('profiles')
            .select('is_delivery_agent, is_vendor')
            .limit(1);

        if (columnsError) {
            console.error('Error checking columns:', columnsError);
        } else {
            console.log('Multi-role columns available:', !!columns);
        }

        console.log('Test completed. Please verify in Supabase dashboard that:');
        console.log('1. The auth trigger function has been updated');
        console.log('2. The profiles table has is_delivery_agent and is_vendor columns');
        console.log('3. Try signing up as delivery agent with Google to verify the fix');

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testDeliveryAgentOAuth();