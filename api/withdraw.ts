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
async function callPaystackAPI(endpoint: string, data: any, method = 'POST') {
    const response = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, {
        method,
        headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    return response.json();
}

// Function to initiate a Paystack transfer
async function initiateTransfer(agentId: string, amount: number, reference: string) {
    try {
        // Get agent's payout profile
        const { data: payoutProfile, error: profileError } = await supabase
            .from('agent_payout_profiles')
            .select('account_number_encrypted, account_name, bank_name')
            .eq('agent_id', agentId)
            .single();

        if (profileError || !payoutProfile) {
            throw new Error('Payout profile not found or invalid');
        }

        // Prepare transfer data
        const transferData = {
            source: 'balance',
            amount: Math.round(amount * 100), // Paystack expects amount in kobo
            recipient: payoutProfile.account_number_encrypted, // This should be a recipient code in real implementation
            reason: `Earnings withdrawal for agent ${agentId}`,
            reference
        };

        // In a real implementation, you would need to create a recipient first
        // For now, we'll assume the recipient code is stored in the payout profile
        const transferResult = await callPaystackAPI('/transfer', transferData);
        return transferResult;
    } catch (error) {
        console.error('Error initiating transfer:', error);
        throw error;
    }
}

// Main handler for withdrawal requests
async function handleWithdrawal(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { agent_id, amount } = body;

        if (!agent_id || !amount || amount <= 0) {
            return new Response(JSON.stringify({ error: 'Invalid request: agent_id and amount are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get agent's wallet information
        const { data: agentWallet, error: walletError } = await supabase
            .from('agent_wallets')
            .select('earnings_wallet_balance')
            .eq('agent_id', agent_id)
            .single();

        if (walletError || !agentWallet) {
            return new Response(JSON.stringify({ error: 'Agent wallet not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if agent has sufficient balance
        const currentBalance = parseFloat(agentWallet.earnings_wallet_balance);
        if (amount > currentBalance) {
            return new Response(JSON.stringify({ error: 'Insufficient balance for withdrawal' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if agent has a verified payout profile
        const { data: payoutProfile, error: profileError } = await supabase
            .from('agent_payout_profiles')
            .select('id, is_verified')
            .eq('agent_id', agent_id)
            .single();

        if (profileError || !payoutProfile || !payoutProfile.is_verified) {
            return new Response(JSON.stringify({ error: 'Agent payout profile not found or not verified' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create a withdrawal record
        const withdrawalReference = `withdraw_${Date.now()}_${agent_id}`;
        const { data: withdrawal, error: withdrawalError } = await supabase
            .from('withdrawals')
            .insert({
                agent_id,
                amount,
                status: 'pending',
                paystack_transfer_code: withdrawalReference
            })
            .select()
            .single();

        if (withdrawalError) {
            console.error('Error creating withdrawal record:', withdrawalError);
            return new Response(JSON.stringify({ error: 'Failed to create withdrawal request' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            // Attempt to initiate the transfer
            const transferResult = await initiateTransfer(agent_id, amount, withdrawalReference);

            if (transferResult.status) {
                // Update withdrawal record with transfer details
                await supabase
                    .from('withdrawals')
                    .update({
                        status: 'processing',
                        paystack_transfer_reference: transferResult.data.reference
                    })
                    .eq('id', withdrawal.id);

                // Debit the agent's earnings wallet
                await supabase.rpc('update_agent_wallet', {
                    p_agent_id: agent_id,
                    p_wallet_type: 'earnings_wallet',
                    p_amount: -amount, // Negative for debit
                    p_transaction_type: 'withdrawal',
                    p_reference_type: 'withdrawal',
                    p_reference_id: withdrawal.id,
                    p_description: `Withdrawal request ${withdrawalReference}`
                });

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Withdrawal request processed successfully',
                    withdrawal_id: withdrawal.id,
                    transfer_code: transferResult.data.transfer_code
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                // Transfer failed, update withdrawal status
                await supabase
                    .from('withdrawals')
                    .update({
                        status: 'failed',
                        error_message: transferResult.message || 'Transfer initiation failed'
                    })
                    .eq('id', withdrawal.id);

                return new Response(JSON.stringify({
                    success: false,
                    error: 'Transfer initiation failed',
                    details: transferResult.message
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (transferError) {
            console.error('Error initiating transfer:', transferError);

            // Update withdrawal record to failed
            await supabase
                .from('withdrawals')
                .update({
                    status: 'failed',
                    error_message: transferError.message || 'Transfer initiation error'
                })
                .eq('id', withdrawal.id);

            return new Response(JSON.stringify({
                success: false,
                error: 'Transfer initiation error',
                details: transferError.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        return new Response(JSON.stringify({ error: 'Error processing withdrawal', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Start the server
serve(handleWithdrawal, { port: 8001 });