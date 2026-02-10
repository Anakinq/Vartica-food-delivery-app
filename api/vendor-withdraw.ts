// api/vendor-withdraw.ts - Vendor Withdrawal API (Deno)
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

// Function to initiate a Paystack transfer to vendor
async function initiateTransferToVendor(vendorId: string, amount: number, reference: string) {
    try {
        // Get vendor's payout profile
        const { data: payoutProfile, error: profileError } = await supabase
            .from('vendor_payout_profiles')
            .select('account_number, bank_code, account_name')
            .eq('vendor_id', vendorId)
            .single();

        if (profileError || !payoutProfile) {
            throw new Error('Payout profile not found');
        }

        // Create transfer recipient first (in production, you'd cache this)
        const recipientData = {
            type: 'nuban',
            name: payoutProfile.account_name,
            account_number: payoutProfile.account_number,
            bank_code: payoutProfile.bank_code,
            description: `Vendor payout - ${vendorId}`
        };

        const createRecipientResult = await callPaystackAPI('/recipient', recipientData);

        if (!createRecipientResult.status) {
            throw new Error(createRecipientResult.message || 'Failed to create recipient');
        }

        // Initiate transfer
        const transferData = {
            source: 'balance',
            amount: Math.round(amount * 100), // Paystack expects amount in kobo
            recipient: createRecipientResult.data.recipient_code,
            reason: `Earnings withdrawal for vendor ${vendorId}`,
            reference
        };

        const transferResult = await callPaystackAPI('/transfer', transferData);
        return transferResult;
    } catch (error) {
        console.error('Error initiating vendor transfer:', error);
        throw error;
    }
}

// Main handler for vendor withdrawal requests
async function handleVendorWithdrawal(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { vendor_id, amount } = body;

        if (!vendor_id || !amount || amount <= 0) {
            return new Response(JSON.stringify({ error: 'Invalid request: vendor_id and amount are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Minimum withdrawal amount
        if (amount < 100) {
            return new Response(JSON.stringify({ error: 'Minimum withdrawal amount is ₦100' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get vendor's wallet information
        const { data: vendorWallet, error: walletError } = await supabase
            .from('vendor_wallets')
            .select('total_earnings, withdrawn_earnings')
            .eq('vendor_id', vendor_id)
            .single();

        if (walletError || !vendorWallet) {
            return new Response(JSON.stringify({ error: 'Vendor wallet not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check available balance
        const currentTotal = parseFloat(vendorWallet.total_earnings);
        const withdrawn = parseFloat(vendorWallet.withdrawn_earnings);
        const availableBalance = currentTotal - withdrawn;

        if (amount > availableBalance) {
            return new Response(JSON.stringify({
                error: 'Insufficient balance for withdrawal',
                availableBalance
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if vendor has a verified payout profile
        const { data: payoutProfile, error: profileError } = await supabase
            .from('vendor_payout_profiles')
            .select('id, verified, bank_name, account_number, account_name')
            .eq('vendor_id', vendor_id)
            .eq('verified', true)
            .single();

        if (profileError || !payoutProfile) {
            return new Response(JSON.stringify({ error: 'Vendor payout profile not found or not verified' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create a withdrawal record
        const withdrawalReference = `vendor_withdraw_${Date.now()}_${vendor_id}`;
        const { data: withdrawal, error: withdrawalError } = await supabase
            .from('vendor_withdrawals')
            .insert({
                vendor_id,
                amount,
                status: 'pending',
                bank_name: payoutProfile.bank_name,
                account_number: payoutProfile.account_number,
                account_name: payoutProfile.account_name,
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

        // For development, auto-approve
        if (Deno.env.get('NODE_ENV') !== 'production') {
            // Auto-complete for development
            await supabase
                .from('vendor_withdrawals')
                .update({
                    status: 'completed',
                    processed_at: new Date().toISOString(),
                })
                .eq('id', withdrawal.id);

            // Update wallet
            await supabase
                .from('vendor_wallets')
                .update({
                    withdrawn_earnings: withdrawn + amount,
                    updated_at: new Date().toISOString(),
                })
                .eq('vendor_id', vendor_id);

            // Record transaction
            await supabase
                .from('vendor_wallet_transactions')
                .insert({
                    vendor_id,
                    transaction_type: 'withdrawal',
                    amount,
                    balance_before: currentTotal,
                    balance_after: currentTotal - amount,
                    description: `Withdrawal to ${payoutProfile.bank_name} (${payoutProfile.account_number})`,
                    reference_id: withdrawal.id
                });

            return new Response(JSON.stringify({
                success: true,
                message: 'Withdrawal completed successfully (Dev mode)',
                withdrawal_id: withdrawal.id,
                amount,
                status: 'completed'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Production: Try to initiate transfer
        try {
            const transferResult = await initiateTransferToVendor(vendor_id, amount, withdrawalReference);

            if (transferResult.status) {
                // Update withdrawal record
                await supabase
                    .from('vendor_withdrawals')
                    .update({
                        status: 'processing',
                        paystack_reference: transferResult.data.reference,
                        processed_at: new Date().toISOString(),
                    })
                    .eq('id', withdrawal.id);

                // Update wallet
                await supabase
                    .from('vendor_wallets')
                    .update({
                        withdrawn_earnings: withdrawn + amount,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('vendor_id', vendor_id);

                // Record transaction
                await supabase
                    .from('vendor_wallet_transactions')
                    .insert({
                        vendor_id,
                        transaction_type: 'withdrawal',
                        amount,
                        balance_before: currentTotal,
                        balance_after: currentTotal - amount,
                        description: `Withdrawal to ${payoutProfile.bank_name}`,
                        reference_id: withdrawal.id
                    });

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Withdrawal request processed successfully',
                    withdrawal_id: withdrawal.id,
                    transfer_reference: transferResult.data.reference,
                    status: 'processing'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                // Transfer failed
                await supabase
                    .from('vendor_withdrawals')
                    .update({
                        status: 'failed',
                        error_message: transferResult.message || 'Transfer failed',
                    })
                    .eq('id', withdrawal.id);

                return new Response(JSON.stringify({
                    success: false,
                    error: 'Transfer failed',
                    details: transferResult.message
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (transferError) {
            console.error('Transfer error:', transferError);

            await supabase
                .from('vendor_withdrawals')
                .update({
                    status: 'failed',
                    error_message: transferError.message || 'Transfer error',
                })
                .eq('id', withdrawal.id);

            return new Response(JSON.stringify({
                success: false,
                error: 'Transfer error',
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
serve(handleVendorWithdrawal, { port: 8002 });
