// ============================================
// CREATE TEST DELIVERY AGENT - Node.js Script
// ============================================
// This script creates a test delivery agent account programmatically
// 
// Usage:
// 1. Update the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env
// 2. Run: node create_test_delivery_agent.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration - Update these with your Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
    process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Test delivery agent details
const testDeliveryAgent = {
    email: 'test.delivery.agent@vartica.edu',
    password: 'TestPassword123!',
    user_metadata: {
        full_name: 'Test Delivery Agent',
        role: 'delivery_agent',
        phone: '+2348012345678',
        vehicle_type: 'bike'
    }
};

async function createTestDeliveryAgent() {
    console.log('🚀 Creating test delivery agent account...');

    try {
        // Step 1: Create the user via Supabase Auth API
        console.log('1. Creating user via Auth API...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: testDeliveryAgent.email,
            password: testDeliveryAgent.password,
            email_confirm: true, // Auto-confirm the email
            user_metadata: testDeliveryAgent.user_metadata
        });

        if (authError) {
            console.error('❌ Error creating user:', authError.message);
            return;
        }

        const userId = authData.user.id;
        console.log(`✅ User created successfully!`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${testDeliveryAgent.email}`);

        // Step 2: Wait a moment for the auth trigger to run
        console.log('2. Waiting for auth trigger to process...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Verify the profile was created
        console.log('3. Verifying profile creation...');
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('❌ Error fetching profile:', profileError.message);
        } else {
            console.log('✅ Profile found:');
            console.log(`   Full Name: ${profileData.full_name}`);
            console.log(`   Role: ${profileData.role}`);
            console.log(`   Phone: ${profileData.phone}`);
        }

        // Step 4: Verify the delivery agent record was created
        console.log('4. Verifying delivery agent record...');
        const { data: agentData, error: agentError } = await supabase
            .from('delivery_agents')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (agentError) {
            console.error('❌ Error fetching delivery agent record:', agentError.message);
            console.log('   Creating delivery agent record manually...');

            // Create delivery agent record manually if it doesn't exist
            const { data: manualAgentData, error: manualAgentError } = await supabase
                .from('delivery_agents')
                .insert({
                    user_id: userId,
                    vehicle_type: testDeliveryAgent.user_metadata.vehicle_type,
                    is_available: true,
                    active_orders_count: 0,
                    total_deliveries: 0,
                    rating: 5.00
                })
                .select()
                .single();

            if (manualAgentError) {
                console.error('❌ Error creating delivery agent record manually:', manualAgentError.message);
            } else {
                console.log('✅ Delivery agent record created manually!');
                console.log(`   Vehicle Type: ${manualAgentData.vehicle_type}`);
                console.log(`   Available: ${manualAgentData.is_available}`);
            }
        } else {
            console.log('✅ Delivery agent record found:');
            console.log(`   Vehicle Type: ${agentData.vehicle_type}`);
            console.log(`   Available: ${agentData.is_available}`);
            console.log(`   Rating: ${agentData.rating}`);
        }

        // Step 5: Final verification
        console.log('5. Final verification...');
        const { data: finalData, error: finalError } = await supabase
            .from('profiles')
            .select(`
        id,
        email,
        full_name,
        role,
        phone,
        delivery_agents (
          vehicle_type,
          is_available,
          active_orders_count,
          total_deliveries,
          rating
        )
      `)
            .eq('id', userId)
            .single();

        if (finalError) {
            console.error('❌ Final verification failed:', finalError.message);
        } else {
            console.log('\n🎉 TEST DELIVERY AGENT CREATED SUCCESSFULLY!');
            console.log('===========================================');
            console.log(`Email: ${finalData.email}`);
            console.log(`Password: ${testDeliveryAgent.password}`);
            console.log(`Full Name: ${finalData.full_name}`);
            console.log(`Role: ${finalData.role}`);
            console.log(`Phone: ${finalData.phone}`);
            if (finalData.delivery_agents) {
                console.log(`Vehicle Type: ${finalData.delivery_agents.vehicle_type}`);
                console.log(`Available: ${finalData.delivery_agents.is_available}`);
                console.log(`Rating: ${finalData.delivery_agents.rating}`);
            }
            console.log('===========================================');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

// Run the function
createTestDeliveryAgent();

// ============================================
// Create multiple test delivery agents
// ============================================
async function createMultipleTestAgents() {
    const testAgents = [
        {
            email: 'delivery1@vartica.edu',
            password: 'TestPassword123!',
            user_metadata: {
                full_name: 'Delivery Agent One',
                role: 'delivery_agent',
                phone: '+2348011111111',
                vehicle_type: 'bike'
            }
        },
        {
            email: 'delivery2@vartica.edu',
            password: 'TestPassword123!',
            user_metadata: {
                full_name: 'Delivery Agent Two',
                role: 'delivery_agent',
                phone: '+2348022222222',
                vehicle_type: 'motorcycle'
            }
        },
        {
            email: 'delivery3@vartica.edu',
            password: 'TestPassword123!',
            user_metadata: {
                full_name: 'Delivery Agent Three',
                role: 'delivery_agent',
                phone: '+2348033333333',
                vehicle_type: 'car'
            }
        }
    ];

    console.log('\n🚀 Creating multiple test delivery agents...');

    for (const agent of testAgents) {
        console.log(`\nCreating ${agent.user_metadata.full_name}...`);

        try {
            const { data, error } = await supabase.auth.admin.createUser({
                email: agent.email,
                password: agent.password,
                email_confirm: true,
                user_metadata: agent.user_metadata
            });

            if (error) {
                console.error(`❌ Failed to create ${agent.user_metadata.full_name}:`, error.message);
            } else {
                console.log(`✅ ${agent.user_metadata.full_name} created successfully!`);
            }
        } catch (error) {
            console.error(`❌ Error creating ${agent.user_metadata.full_name}:`, error.message);
        }
    }

    console.log('\n🏁 Multiple agent creation process completed!');
}

// Uncomment the line below to create multiple test agents
// createMultipleTestAgents();