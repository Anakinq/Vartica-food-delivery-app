import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { agent_id, amount } = req.body;

        if (!agent_id || !amount || amount <= 0) {
            return res.status(400).json({
                error: 'Invalid request: agent_id and amount are required'
            });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
        const PAYSTACK_BASE_URL = 'https://api.paystack.co';

        // Get agent's user_id from delivery_agents table
        const { data: agentData, error: agentError } = await supabase
            .from('delivery_agents')
            .select('user_id')
            .eq('id', agent_id)
            .single();

        if (agentError || !agentData) {
            return res.status(404).json({ error: 'Delivery agent not found' });
        }

        const user_id = agentData.user_id;

        // Get agent's wallet information
        const { data: agentWallet, error: walletError } = await supabase
            .from('agent_wallets')
            .select('earnings_wallet_balance')
            .eq('agent_id', agent_id)
            .single();

        if (walletError || !agentWallet) {
            return res.status(404).json({ error: 'Agent wallet not found' });
        }

        const currentBalance = parseFloat(agentWallet.earnings_wallet_balance);
        if (amount > currentBalance) {
            return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
        }

        // Check payout profile using user_id
        const { data: payoutProfile, error: profileError } = await supabase
            .from('agent_payout_profiles')
            .select('id, verified, account_number, bank_code, account_name, recipient_code')
            .eq('user_id', user_id)
            .single();

        if (profileError || !payoutProfile) {
            return res.status(400).json({
                error: 'Agent payout profile not found. Please add your bank details first.'
            });
        }

        if (!payoutProfile.verified) {
            return res.status(400).json({
                error: 'Bank details not verified. Please verify your bank details first.'
            });
        }

        // Create transfer recipient if it doesn't exist
        let recipientCode = payoutProfile.recipient_code;
        if (!recipientCode) {
            try {
                const recipientResponse = await fetch(`${PAYSTACK_BASE_URL}/transferrecipient`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'nuban',
                        name: payoutProfile.account_name,
                        account_number: payoutProfile.account_number,
                        bank_code: payoutProfile.bank_code,
                        currency: 'NGN'
                    })
                });

                if (!recipientResponse.ok) {
                    const errorText = await recipientResponse.text();
                    console.error('Paystack recipient error:', errorText);
                    throw new Error(`Paystack API Error: ${recipientResponse.status} - ${errorText}`);
                }

                const recipientResult = await recipientResponse.json();

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
                return res.status(500).json({
                    error: 'Failed to create transfer recipient',
                    details: recipientError.message
                });
            }
        }

        const withdrawalReference = `withdraw_${Date.now()}_${agent_id}`;

        // Create withdrawal record
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
            return res.status(500).json({ error: 'Failed to create withdrawal request' });
        }

        try {
            // Initiate the transfer
            const transferResponse = await fetch(`${PAYSTACK_BASE_URL}/transfer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'balance',
                    amount: Math.round(amount * 100), // Convert to kobo
                    recipient: recipientCode,
                    reason: 'Earnings withdrawal',
                    reference: withdrawalReference
                })
            });

            if (!transferResponse.ok) {
                const errorText = await transferResponse.text();
                console.error('Paystack transfer error:', errorText);
                throw new Error(`Paystack API Error: ${transferResponse.status} - ${errorText}`);
            }

            const transferResult = await transferResponse.json();

            if (transferResult.status) {
                // Update withdrawal status
                await supabase
                    .from('withdrawals')
                    .update({
                        status: 'processing',
                        paystack_transfer_code: transferResult.data.transfer_code,
                        paystack_reference: transferResult.data.reference
                    })
                    .eq('id', withdrawal.id);

                // Update agent wallet
                await supabase.rpc('update_agent_wallet', {
                    p_agent_id: agent_id,
                    p_wallet_type: 'earnings_wallet',
                    p_amount: -amount,
                    p_transaction_type: 'withdrawal',
                    p_reference_type: 'withdrawal',
                    p_reference_id: withdrawal.id,
                    p_description: `Withdrawal request ${withdrawalReference}`
                });

                return res.status(200).json({
                    success: true,
                    message: 'Withdrawal request processed successfully',
                    withdrawal_id: withdrawal.id,
                    transfer_code: transferResult.data.transfer_code,
                    reference: transferResult.data.reference
                });
            } else {
                // Update withdrawal as failed
                await supabase
                    .from('withdrawals')
                    .update({
                        status: 'failed',
                        error_message: transferResult.message || 'Transfer initiation failed'
                    })
                    .eq('id', withdrawal.id);

                return res.status(400).json({
                    success: false,
                    error: 'Transfer initiation failed',
                    details: transferResult.message
                });
            }
        } catch (transferError) {
            console.error('Error initiating transfer:', transferError);

            // Update withdrawal as failed
            await supabase
                .from('withdrawals')
                .update({
                    status: 'failed',
                    error_message: transferError.message || 'Transfer initiation error'
                })
                .eq('id', withdrawal.id);

            return res.status(500).json({
                success: false,
                error: 'Transfer initiation error',
                details: transferError.message
            });
        }
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        return res.status(500).json({
            error: 'Error processing withdrawal',
            details: error.message
        });
    }
}