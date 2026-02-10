import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

// Initialize Supabase client
const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Paystack secret key for transfers
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;

// Helper function to verify webhook signature (for production)
async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(PAYSTACK_SECRET);
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
        );
        const signatureData = encoder.encode(payload);
        const hmacSignature = await crypto.subtle.sign('HMAC', key, signatureData);
        const signatureArray = new Uint8Array(hmacSignature);
        const hexSignature = Array.from(signatureArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return hexSignature === signature;
    } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
    }
}

// Function to create Paystack transfer recipient
async function createTransferRecipient(accountNumber: string, bankCode: string, accountName: string) {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'nuban',
            name: accountName,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: 'NGN',
        }),
    });

    const data = await response.json();
    return data;
}

// Function to initiate transfer
async function initiateTransfer(amount: number, recipientCode: string, reason: string) {
    const amountInKobo = Math.round(amount * 100);

    const response = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source: 'balance',
            amount: amountInKobo,
            recipient: recipientCode,
            reason: reason,
        }),
    });

    const data = await response.json();
    return data;
}

// Function to handle vendor withdrawal
async function handleVendorWithdrawal(vendorId: string, amount: number) {
    try {
        // Get vendor's payout profile
        const { data: payoutProfile, error: profileError } = await supabase
            .from('vendor_payout_profiles')
            .select('*')
            .eq('vendor_id', vendorId)
            .single();

        if (profileError || !payoutProfile) {
            return { success: false, message: 'No payout profile found. Please set up your bank details first.' };
        }

        // Get vendor wallet balance
        const { data: wallet, error: walletError } = await supabase
            .from('vendor_wallets')
            .select('total_earnings, withdrawn_earnings')
            .eq('vendor_id', vendorId)
            .single();

        if (walletError || !wallet) {
            return { success: false, message: 'Wallet not found' };
        }

        const availableBalance = wallet.total_earnings - wallet.withdrawn_earnings;
        if (amount > availableBalance) {
            return { success: false, message: `Insufficient balance. Available: ₦${availableBalance.toFixed(2)}` };
        }

        // Minimum withdrawal amount
        if (amount < 100) {
            return { success: false, message: 'Minimum withdrawal amount is ₦100' };
        }

        // Create withdrawal record
        const { data: withdrawal, error: withdrawalError } = await supabase
            .from('vendor_withdrawals')
            .insert([{
                vendor_id: vendorId,
                amount: amount,
                status: 'pending',
                created_at: new Date().toISOString(),
            }])
            .select()
            .single();

        if (withdrawalError) {
            return { success: false, message: 'Failed to create withdrawal request' };
        }

        // Create Paystack transfer recipient if not exists
        let recipientCode = payoutProfile.paystack_recipient_code;

        if (!recipientCode) {
            const recipientResult = await createTransferRecipient(
                payoutProfile.account_number,
                payoutProfile.bank_code,
                payoutProfile.account_name
            );

            if (!recipientResult.status) {
                // Update withdrawal status to failed
                await supabase
                    .from('vendor_withdrawals')
                    .update({ status: 'failed', error_message: recipientResult.message })
                    .eq('id', withdrawal.id);

                return { success: false, message: `Failed to create transfer recipient: ${recipientResult.message}` };
            }

            recipientCode = recipientResult.data.recipient_code;

            // Save recipient code to payout profile
            await supabase
                .from('vendor_payout_profiles')
                .update({ paystack_recipient_code: recipientCode })
                .eq('vendor_id', vendorId);
        }

        // Initiate transfer
        const transferResult = await initiateTransfer(
            amount,
            recipientCode,
            `Vendor withdrawal - Order earnings`
        );

        if (!transferResult.status) {
            // Update withdrawal status to failed
            await supabase
                .from('vendor_withdrawals')
                .update({ status: 'failed', error_message: transferResult.message })
                .eq('id', withdrawal.id);

            return { success: false, message: `Transfer failed: ${transferResult.message}` };
        }

        // Update withdrawal with transfer code
        await supabase
            .from('vendor_withdrawals')
            .update({
                status: 'processing',
                paystack_transfer_code: transferResult.data.transfer_code
            })
            .eq('id', withdrawal.id);

        // Update vendor wallet (pending withdrawal)
        await supabase.rpc('update_vendor_wallet', {
            p_vendor_id: vendorId,
            p_amount: amount,
            p_transaction_type: 'debit',
            p_reference_type: 'withdrawal',
            p_reference_id: withdrawal.id,
            p_description: `Withdrawal request - ₦${amount.toFixed(2)}`
        });

        return {
            success: true,
            message: 'Withdrawal request submitted successfully!',
            withdrawal_id: withdrawal.id,
            transfer_code: transferResult.data.transfer_code
        };

    } catch (error) {
        console.error('Error processing vendor withdrawal:', error);
        return { success: false, message: 'Error processing withdrawal', error: error.message };
    }
}

// Main handler
async function handleWebhook(request: Request) {
    const signature = request.headers.get('X-Paystack-Signature');
    const payload = await request.text();

    // Verify webhook signature (skip in dev mode)
    const isDevMode = Deno.env.get('DEV_MODE') === 'true';

    if (!isDevMode && signature && !await verifyWebhookSignature(payload, signature)) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const event = JSON.parse(payload);

        switch (event.event) {
            case 'transfer.success':
            case 'transfer.failed':
                // Handle transfer status updates
                const transferCode = event.data.transfer_code;
                const newStatus = event.event === 'transfer.success' ? 'completed' : 'failed';

                await supabase
                    .from('vendor_withdrawals')
                    .update({
                        status: newStatus,
                        processed_at: new Date().toISOString(),
                        error_message: event.data.fail_reason || null
                    })
                    .eq('paystack_transfer_code', transferCode);

                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });

            default:
                return new Response(JSON.stringify({ message: 'Event not handled' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new Response(JSON.stringify({ error: 'Error processing webhook' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST handler for withdrawal requests
async function handlePostRequest(request: Request) {
    try {
        const body = await request.json();
        const { vendor_id, amount } = body;

        if (!vendor_id || !amount) {
            return new Response(JSON.stringify({ error: 'Missing vendor_id or amount' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await handleVendorWithdrawal(vendor_id, amount);
        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 400,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error handling withdrawal request:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Main server handler
async function handleRequest(request: Request) {
    if (request.method === 'POST') {
        // Check if it's a webhook callback or a withdrawal request
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const body = await request.json();
            if (body.event === 'transfer.success' || body.event === 'transfer.failed') {
                return handleWebhook(request);
            }
            return handlePostRequest(request);
        }
        return handleWebhook(request);
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
    });
}

serve(handleRequest, { port: 8001 });
