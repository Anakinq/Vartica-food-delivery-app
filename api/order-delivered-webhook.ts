// api/order-delivered-webhook.ts - Auto-credit vendor when order is delivered
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';

// Initialize Supabase client
const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Function to credit vendor wallet when order is delivered
async function creditVendorForOrder(orderId: string) {
    try {
        // Get order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, seller_id, seller_type, total, platform_commission, order_number')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            console.error('Order not found:', orderId);
            return { success: false, error: 'Order not found' };
        }

        // Only credit for vendor orders, not cafeterias
        if (order.seller_type !== 'vendor' && order.seller_type !== 'late_night_vendor') {
            console.log('Skipping wallet credit for cafeteria order');
            return { success: true, message: 'Cafeteria order - no wallet credit' };
        }

        const vendorId = order.seller_id;
        const platformCommission = parseFloat(order.platform_commission || '200');
        const vendorEarnings = parseFloat(order.total) - platformCommission;

        console.log(`Crediting vendor ${vendorId} with ₦${vendorEarnings} for order ${order.order_number}`);

        // Check if already credited (idempotency)
        const { data: existingTransaction } = await supabase
            .from('vendor_wallet_transactions')
            .select('id')
            .eq('order_id', orderId)
            .eq('transaction_type', 'credit')
            .single();

        if (existingTransaction) {
            console.log('Vendor already credited for this order');
            return { success: true, message: 'Already credited' };
        }

        // Get vendor wallet
        const { data: wallet, error: walletError } = await supabase
            .from('vendor_wallets')
            .select('id, total_earnings, pending_earnings')
            .eq('vendor_id', vendorId)
            .single();

        if (walletError || !wallet) {
            console.error('Vendor wallet not found:', vendorId);
            return { success: false, error: 'Vendor wallet not found' };
        }

        const newTotal = parseFloat(wallet.total_earnings) + vendorEarnings;
        const newPending = parseFloat(wallet.pending_earnings) - vendorEarnings;

        // Update wallet
        const { error: updateError } = await supabase
            .from('vendor_wallets')
            .update({
                total_earnings: newTotal,
                pending_earnings: Math.max(0, newPending),
                updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

        if (updateError) {
            console.error('Error updating wallet:', updateError);
            return { success: false, error: updateError.message };
        }

        // Record transaction
        const { error: transactionError } = await supabase
            .from('vendor_wallet_transactions')
            .insert({
                vendor_id: vendorId,
                order_id: orderId,
                transaction_type: 'credit',
                amount: vendorEarnings,
                balance_before: parseFloat(wallet.total_earnings),
                balance_after: newTotal,
                description: `Earnings from order ${order.order_number}`,
                reference_id: orderId
            });

        if (transactionError) {
            console.error('Error recording transaction:', transactionError);
            return { success: false, error: transactionError.message };
        }

        console.log(`Successfully credited vendor ${vendorId}`);
        return { success: true, vendorId, amount: vendorEarnings };

    } catch (error) {
        console.error('Error in creditVendorForOrder:', error);
        return { success: false, error: error.message };
    }
}

// Main webhook handler
async function handleWebhook(request: Request) {
    // Only allow POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await request.json();
        const { order_id, action } = body;

        // Verify it's an order delivered webhook
        if (action !== 'order_delivered') {
            return new Response(JSON.stringify({ error: 'Invalid action' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!order_id) {
            return new Response(JSON.stringify({ error: 'order_id is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('Processing order delivered webhook:', order_id);

        const result = await creditVendorForOrder(order_id);

        if (result.success) {
            return new Response(JSON.stringify({
                success: true,
                message: result.message || 'Vendor credited successfully',
                vendor_id: result.vendorId,
                amount: result.amount
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: result.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Start the server
serve(handleWebhook, { port: 8003 });
