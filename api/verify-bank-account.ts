import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

// Initialize Supabase client
const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Paystack API details
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Helper function to make Paystack API calls
async function callPaystackAPI(endpoint: string, params?: any, method = 'GET', data?: any) {
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
    };

    let url = `${PAYSTACK_BASE_URL}${endpoint}`;
    let body = undefined;

    if (method === 'GET' && params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams}`;
    } else if (data) {
        body = JSON.stringify(data);
    }

    const response = await fetch(url, {
        method,
        headers,
        body
    });

    return response.json();
}

// Main handler for bank account verification
async function handleRequest(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { agent_id, account_number, bank_code } = body;

        if (!agent_id || !account_number || !bank_code) {
            return new Response(JSON.stringify({ error: 'Missing required fields: agent_id, account_number, bank_code' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify the account number using Paystack API
        const verificationResult = await callPaystackAPI('/bank/resolve', {
            account_number,
            bank_code
        });

        if (!verificationResult.status) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Account verification failed',
                details: verificationResult.message
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get the agent's user ID to ensure they have the right permissions
        const { data: agentData, error: agentError } = await supabase
            .from('delivery_agents')
            .select('user_id')
            .eq('id', agent_id)
            .single();

        if (agentError || !agentData) {
            return new Response(JSON.stringify({ error: 'Agent not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Store the verified account details in the database
        const { data: existingProfile, error: selectError } = await supabase
            .from('agent_payout_profiles')
            .select('id')
            .eq('user_id', agentData.user_id)
            .single();

        let result;
        if (existingProfile) {
            // Update existing profile
            const { data, error } = await supabase
                .from('agent_payout_profiles')
                .update({
                    account_number: account_number,
                    account_name: verificationResult.data.account_name,
                    bank_code: bank_code,
                    verified: true
                })
                .eq('user_id', agentData.user_id)
                .select();

            if (error) {
                throw error;
            }
            result = data;
        } else {
            // Create new profile
            const { data, error } = await supabase
                .from('agent_payout_profiles')
                .insert({
                    user_id: agentData.user_id,
                    account_number: account_number,
                    account_name: verificationResult.data.account_name,
                    bank_code: bank_code,
                    verified: true
                })
                .select();

            if (error) {
                throw error;
            }
            result = data;
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Bank account verified and saved successfully',
            data: {
                account_name: verificationResult.data.account_name,
                bank_name: verificationResult.data.bank_name
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error verifying bank account:', error);
        return new Response(JSON.stringify({ error: 'Error verifying bank account', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Start the server
serve(handleRequest, { port: 8003 });