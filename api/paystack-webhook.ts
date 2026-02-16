import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.23.0';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Paystack secret key for webhook verification
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!;

// Helper function to verify Paystack webhook signature using Deno's native crypto
async function verifyPaystackSignature(payload: string, signature: string): Promise<boolean> {
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

    if (hexSignature.length !== signature.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < hexSignature.length; i++) {
      mismatch |= hexSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }

    return mismatch === 0;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Function to verify payment and mark order as paid (escrow model)
async function processPaymentVerification(eventData: any) {
  try {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, payment_status, total, subtotal, delivery_fee, platform_commission')
      .eq('order_number', eventData.reference)
      .single();

    if (orderError || !orderData) {
      console.error(`Order not found for reference: ${eventData.reference}`);
      return { success: false, message: 'Order not found' };
    }

    const paidAmount = parseFloat(eventData.amount) / 100;
    const orderTotal = parseFloat(orderData.total);

    if (Math.abs(paidAmount - orderTotal) > 0.01) {
      console.error(`Payment amount mismatch: Expected ₦${orderTotal}, Got ₦${paidAmount}`);
      return { success: false, message: 'Payment amount mismatch' };
    }

    // Mark order as paid ONLY - NO wallet credit (escrow model)
    // Wallet will be credited when agent accepts the order
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_reference: eventData.reference,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderData.id);

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError);
      return { success: false, message: 'Failed to update order' };
    }

    console.log(`✅ Payment verified for order ${orderData.order_number}`);
    console.log(`   Amount: ₦${paidAmount}`);
    console.log(`   Status: paid (wallet will be credited when agent accepts)`);

    return {
      success: true,
      message: 'Payment verified successfully',
      order_number: orderData.order_number,
      amount: paidAmount
    };
  } catch (error) {
    console.error('Error processing payment verification:', error);
    return { success: false, message: 'Error processing payment', error: error.message };
  }
}

// Function to handle transfer status updates from Paystack
async function handleTransferStatus(eventData: any) {
  try {
    const transferReference = eventData.transfer.transfer_code;

    const { error } = await supabase
      .from('withdrawals')
      .update({
        status: eventData.transfer.status === 'success' ? 'completed' : 'failed',
        processed_at: new Date().toISOString(),
        error_message: eventData.transfer.status !== 'success' ? eventData.transfer.fail_reason : null
      })
      .eq('paystack_transfer_code', transferReference);

    if (error) {
      console.error('Error updating withdrawal status:', error);
      return { success: false, message: 'Failed to update withdrawal status' };
    }

    console.log(`Successfully updated withdrawal status for transfer: ${transferReference}`);
    return { success: true, message: 'Withdrawal status updated successfully' };
  } catch (error) {
    console.error('Error handling transfer status:', error);
    return { success: false, message: 'Error handling transfer status', error: error.message };
  }
}

// Main webhook handler
async function handleWebhook(request: Request) {
  const signature = request.headers.get('X-Paystack-Signature');
  const payload = await request.text();

  const isDevMode = Deno.env.get('DEV_MODE') === 'true' || Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;

  if (!isDevMode && signature && !await verifyPaystackSignature(payload, signature)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const event = JSON.parse(payload);

    if (isDevMode) {
      console.log('DEV MODE: Processing webhook event:', event.event);
    }

    switch (event.event) {
      case 'charge.success':
        // Payment verification only (escrow model)
        const result = await processPaymentVerification(event.data);
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        });

      case 'transfer.success':
      case 'transfer.failed':
        const transferResult = await handleTransferStatus(event);
        return new Response(JSON.stringify(transferResult), {
          status: transferResult.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        console.log(`Unhandled event type: ${event.event}`);
        return new Response(JSON.stringify({ message: 'Event type not handled' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Error processing webhook', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

serve(handleWebhook, { port: 8000 });
