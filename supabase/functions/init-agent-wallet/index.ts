import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

// Initialize Supabase client
const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Main handler for creating agent wallet
async function handleRequest(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { agent_id } = body;

        if (!agent_id) {
            return new Response(JSON.stringify({ error: 'Missing required field: agent_id' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if wallet already exists
        const { data: existingWallet, error: selectError } = await supabase
            .from('agent_wallets')
            .select('id')
            .eq('agent_id', agent_id)
            .single();

        if (existingWallet) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Wallet already exists'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create the wallet
        const { data, error } = await supabase
            .from('agent_wallets')
            .insert({
                agent_id,
                food_wallet_balance: 0,
                earnings_wallet_balance: 0
            })
            .select();

        if (error) {
            console.error('Error creating agent wallet:', error);
            return new Response(JSON.stringify({
                success: false,
                error: 'Failed to create agent wallet',
                details: error.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Agent wallet created successfully',
            data
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error in init-agent-wallet:', error);
        return new Response(JSON.stringify({ error: 'Error creating agent wallet', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Start the server
serve(handleRequest, { port: 8004 });