import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

async function callPaystackAPI(endpoint: string, data: any = null, method = 'GET') {
    const headers: Record<string, string> = {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
    };

    let url = `${PAYSTACK_BASE_URL}${endpoint}`;
    let body = undefined;

    if (method === 'GET' && data) {
        const searchParams = new URLSearchParams(data);
        url += `?${searchParams}`;
    } else if (data) {
        body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, {
            method,
            headers,
            body
        });

        // Check if response is ok before trying to parse JSON
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Paystack API Error (${response.status}):`, errorText);
            throw new Error(`Paystack API Error: ${response.status} - ${errorText}`);
        }

        const responseText = await response.text();
        if (!responseText) {
            throw new Error('Empty response from Paystack API');
        }

        try {
            return JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Failed to parse JSON response:', responseText);
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
        }
    } catch (error) {
        console.error('Error calling Paystack API:', error);
        throw error;
    }
}

async function createTransferRecipient(accountNumber: string, accountName: string, bankCode: string) {
    try {
        const recipientData = {
            type: 'nuban',
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: 'NGN'
        };

        const result = await callPaystackAPI('/transferrecipient', recipientData, 'POST');
        return result;
    } catch (error) {
        console.error('Error creating transfer recipient:', error);
        throw error;
    }
}

async function initiateTransfer(recipientCode: string, amount: number, reference: string) {
    try {
        const transferData = {
            source: 'balance',
            amount: Math.round(amount * 100), // Convert to kobo
            recipient: recipientCode,
            reason: 'Earnings withdrawal',
            reference
        };

        const transferResult = await callPaystackAPI('/transfer', transferData, 'POST');
        return transferResult;
    } catch (error) {
        console.error('Error initiating transfer:', error);
        throw error;
    }
}

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

        // Get agent's user_id from delivery_agents table
        const { data: agentData, error: agentError } = await supabase
            .from('delivery_agents')
            .select('user_id')
            .eq('id', agent_id)
            .single();

        if (agentError || !agentData) {
            return new Response(JSON.stringify({ error: 'Delivery agent not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user_id = agentData.user_id;

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

        const currentBalance = parseFloat(agentWallet.earnings_wallet_balance);
        if (amount > currentBalance) {
            return new Response(JSON.stringify({ error: 'Insufficient balance for withdrawal' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check payout profile using user_id
        const { data: payoutProfile, error: profileError } = await supabase
            .from('agent_payout_profiles')
            .select('id, verified, account_number, bank_code, account_name, recipient_code')
            .eq('user_id', user_id)
            .single();

        if (profileError || !payoutProfile) {
            return new Response(JSON.stringify({ error: 'Agent payout profile not found. Please add your bank details first.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!payoutProfile.verified) {
            return new Response(JSON.stringify({ error: 'Bank details not verified. Please verify your bank details first.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create transfer recipient if it doesn't exist
        let recipientCode = payoutProfile.recipient_code;
        if (!recipientCode) {
            try {
                const recipientResult = await createTransferRecipient(
                    payoutProfile.account_number,
                    payoutProfile.account_name,
                    payoutProfile.bank_code
                );

                if (!recipientResult.status) {
                    throw new Error(recipientResult.message || 'Failed to create transfer recipient');
                }

                recipientCode = recipientResult.data.recipient_code;

                // Update the profile with the recipient code
                const { error: updateError } = await supabase
                    .from('agent_payout_profiles')
                    .update({ recipient_code: recipientCode })
                    .eq('user_id', user_id);

                if (updateError) {
                    console.error('Error updating recipient code:', updateError);
                }
            } catch (recipientError) {
                console.error('Error creating transfer recipient:', recipientError);
                return new Response(JSON.stringify({
                    error: 'Failed to create transfer recipient',
                    details: recipientError.message
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        const withdrawalReference = `withdraw_${Date.now()}_${agent_id}`;
        const { data: withdrawal, error: withdrawalError } = await supabase
            .from('withdrawals')
            .insert({
                agent_id,
                amount,
                status: 'pending',
                paystack_transfer_reference: withdrawalReference
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
            const transferResult = await initiateTransfer(recipientCode, amount, withdrawalReference);

            if (transferResult.status) {
                await supabase
                    .from('withdrawals')
                    .update({
                        status: 'processing',
                        paystack_transfer_code: transferResult.data.transfer_code,
                        paystack_reference: transferResult.data.reference
                    })
                    .eq('id', withdrawal.id);

                await supabase.rpc('update_agent_wallet', {
                    p_agent_id: agent_id,
                    p_wallet_type: 'earnings_wallet',
                    p_amount: -amount,
                    p_transaction_type: 'withdrawal',
                    p_reference_type: 'withdrawal',
                    p_reference_id: withdrawal.id,
                    p_description: `Withdrawal request ${withdrawalReference}`
                });

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Withdrawal request processed successfully',
                    withdrawal_id: withdrawal.id,
                    transfer_code: transferResult.data.transfer_code,
                    reference: transferResult.data.reference
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
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

serve(handleWithdrawal, { port: 8001 });
