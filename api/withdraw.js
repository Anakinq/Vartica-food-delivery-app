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
        let { data: agentData, error: agentError } = await supabase
            .from('delivery_agents')
            .select('user_id')
            .eq('id', agent_id)
            .single();

        // If the specific select fails, try a more general query
        if (agentError || !agentData) {
            const { data: fallbackAgentData, error: fallbackAgentError } = await supabase
                .from('delivery_agents')
                .select('*')
                .eq('id', agent_id)
                .single();

            if (fallbackAgentError || !fallbackAgentData) {
                return res.status(404).json({ error: 'Delivery agent not found' });
            }

            // Extract user_id from the fallback data
            agentData = { user_id: fallbackAgentData.user_id };
        }

        if (!agentData) {
            return res.status(404).json({ error: 'Delivery agent not found' });
        }

        const user_id = agentData.user_id;

        // Get agent's wallet information
        let { data: agentWallet, error: walletError } = await supabase
            .from('agent_wallets')
            .select('earnings_wallet_balance')
            .eq('agent_id', agent_id)
            .single();

        if (walletError) {
            console.error('Wallet lookup error:', walletError);
            // Wallet might not exist yet, create it
            const { error: createError } = await supabase
                .from('agent_wallets')
                .insert({
                    agent_id: agent_id,
                    food_wallet_balance: 0,
                    earnings_wallet_balance: 0
                });

            if (createError) {
                console.error('Failed to create wallet:', createError);
                return res.status(500).json({ error: 'Failed to initialize agent wallet' });
            }

            // Try again
            const { data: newWallet, error: newWalletError } = await supabase
                .from('agent_wallets')
                .select('earnings_wallet_balance')
                .eq('agent_id', agent_id)
                .single();

            if (newWalletError || !newWallet) {
                // Try fallback approach to get wallet data
                const { data: fallbackWallet, error: fallbackWalletError } = await supabase
                    .from('agent_wallets')
                    .select('*')
                    .eq('agent_id', agent_id)
                    .single();

                if (fallbackWalletError || !fallbackWallet) {
                    return res.status(404).json({ error: 'Agent wallet not found' });
                }

                // Use fallback wallet data
                agentWallet = {
                    earnings_wallet_balance: fallbackWallet.earnings_wallet_balance || fallbackWallet.earnings_balance || 0
                };
            } else {
                agentWallet = newWallet;
            }
        }

        if (!agentWallet) {
            return res.status(404).json({ error: 'Agent wallet not found' });
        }

        const currentBalance = parseFloat(agentWallet.earnings_wallet_balance || agentWallet.earnings_balance || 0);
        if (amount > currentBalance) {
            return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
        }

        // Check payout profile using user_id
        let { data: payoutProfile, error: profileError } = await supabase
            .from('agent_payout_profiles')
            .select('id, verified, account_number, bank_code, account_name, recipient_code')
            .eq('user_id', user_id)
            .single();

        // If there's an error or profile doesn't exist, try alternative query
        if (profileError || !payoutProfile) {
            // Try to get the payout profile using a more flexible approach
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('agent_payout_profiles')
                .select('*')  // Select all columns to see what's available
                .eq('user_id', user_id)
                .single();

            if (fallbackError) {
                console.error('Profile lookup error:', {
                    user_id: user_id,
                    error: profileError || fallbackError
                });
                return res.status(400).json({
                    error: 'Agent payout profile not found. Please add your bank details first.',
                    debug: {
                        user_id: user_id,
                        profile_error: (profileError || fallbackError).message
                    }
                });
            }

            // Map the fallback data to expected structure
            payoutProfile = {
                id: fallbackData.id,
                verified: fallbackData.verified || fallbackData.is_verified || false,
                account_number: fallbackData.account_number,
                bank_code: fallbackData.bank_code,
                account_name: fallbackData.account_name,
                recipient_code: fallbackData.recipient_code
            };
        }

        if (!payoutProfile) {
            console.error('Profile not found for user_id:', user_id);
            return res.status(400).json({
                error: 'Agent payout profile not found. Please add your bank details first.',
                debug: {
                    user_id: user_id,
                    profile_exists: false
                }
            });
        }

        if (!(payoutProfile.verified || payoutProfile.is_verified)) {
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
                try {
                    await supabase
                        .from('agent_payout_profiles')
                        .update({ recipient_code: recipientCode })
                        .eq('user_id', user_id);
                } catch (updateError) {
                    console.error('Error updating recipient code:', updateError);

                    // Try alternative column name if the standard one doesn't exist
                    try {
                        await supabase
                            .from('agent_payout_profiles')
                            .update({ recipient_code: recipientCode })
                            .eq('user_id', user_id);
                    } catch (altUpdateError) {
                        console.error('Error updating recipient code with alternative approach:', altUpdateError);
                    }
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

        // Create withdrawal record - using withdrawals table which has the correct FK relationship
        let { data: withdrawal, error: withdrawalError } = await supabase
            .from('withdrawals')
            .insert({
                agent_id,
                amount,
                type: 'delivery_earnings',  // Required field for withdrawals table
                status: 'pending'
            })
            .select()
            .single();

        // If there's an error creating the withdrawal, try a simpler insert
        if (withdrawalError) {
            console.error('Error creating withdrawal record with full insert:', withdrawalError);

            // Try inserting with minimal required fields only
            const { data: simpleWithdrawal, error: simpleError } = await supabase
                .from('withdrawals')
                .insert({
                    agent_id: agent_id,
                    amount: amount,
                    type: 'delivery_earnings'  // Required field for withdrawals table
                })
                .select('id, agent_id, amount, status, type')
                .single();

            if (simpleError) {
                console.error('Error creating withdrawal record with simple insert:', simpleError);

                // If the simple insert still fails, try with all required fields
                const { data: fallbackWithdrawal, error: fallbackError } = await supabase
                    .from('withdrawals')
                    .insert({
                        agent_id: agent_id,
                        amount: amount,
                        type: 'delivery_earnings',  // Required field for withdrawals table
                        status: 'pending'
                    })
                    .select('id, agent_id, amount, status, type')
                    .single();

                if (fallbackError) {
                    console.error('Error creating withdrawal record with fallback insert:', fallbackError);
                    return res.status(500).json({
                        error: 'Failed to create withdrawal request',
                        details: withdrawalError.message || simpleError.message || fallbackError.message
                    });
                }

                withdrawal = fallbackWithdrawal;
            } else {
                withdrawal = simpleWithdrawal;
            }
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
                try {
                    await supabase
                        .from('withdrawals')  // Changed to use correct table
                        .update({
                            status: 'processing',
                            paystack_transfer_code: transferResult.data.transfer_code  // Changed to match withdrawals table schema
                        })
                        .eq('id', withdrawal.id);
                } catch (updateError) {
                    // If the full update fails, try updating just the status
                    console.error('Error updating withdrawal with full data:', updateError);
                    try {
                        await supabase
                            .from('withdrawals')  // Changed to use correct table
                            .update({ status: 'processing' })
                            .eq('id', withdrawal.id);
                    } catch (statusUpdateError) {
                        console.error('Error updating withdrawal status only:', statusUpdateError);
                    }
                }

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
                    transfer_code: transferResult.data.transfer_code
                });
            } else {
                // Update withdrawal as failed
                try {
                    await supabase
                        .from('withdrawals')  // Changed to use correct table
                        .update({
                            status: 'failed',
                            error_message: transferResult.message || 'Transfer initiation failed'  // Changed to match withdrawals table schema
                        })
                        .eq('id', withdrawal.id);
                } catch (updateError) {
                    // If the full update fails, try updating just the status
                    console.error('Error updating withdrawal as failed with full data:', updateError);
                    try {
                        await supabase
                            .from('withdrawals')  // Changed to use correct table
                            .update({ status: 'failed' })
                            .eq('id', withdrawal.id);
                    } catch (statusUpdateError) {
                        console.error('Error updating withdrawal status to failed only:', statusUpdateError);
                    }
                }

                return res.status(400).json({
                    success: false,
                    error: 'Transfer initiation failed',
                    details: transferResult.message
                });
            }
        } catch (transferError) {
            console.error('Error initiating transfer:', transferError);

            // Update withdrawal as failed
            try {
                await supabase
                    .from('withdrawals')  // Changed to use correct table
                    .update({
                        status: 'failed',
                        error_message: transferError.message || 'Transfer initiation error'  // Changed to match withdrawals table schema
                    })
                    .eq('id', withdrawal.id);
            } catch (updateError) {
                // If the full update fails, try updating just the status
                console.error('Error updating withdrawal as failed with full data:', updateError);
                try {
                    await supabase
                        .from('withdrawals')  // Changed to use correct table
                        .update({ status: 'failed' })
                        .eq('id', withdrawal.id);
                } catch (statusUpdateError) {
                    console.error('Error updating withdrawal status to failed only:', statusUpdateError);
                }
            }

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