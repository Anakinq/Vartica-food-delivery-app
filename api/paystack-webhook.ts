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

// Payment split percentages (configurable)
const PLATFORM_FEE_PERCENTAGE = 0.04; // 4% platform fee
const AGENT_EARNINGS_PERCENTAGE = 0.06; // 6% agent earnings from total amount

// Helper function to verify Paystack webhook signature using Deno's native crypto
async function verifyPaystackSignature(payload: string, signature: string): Promise<boolean> {
  try {
    // Use Deno's native crypto.subtle for HMAC verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(PAYSTACK_SECRET);

    // Import the secret key for HMAC-SHA512
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    // Sign the payload
    const signatureData = encoder.encode(payload);
    const hmacSignature = await crypto.subtle.sign('HMAC', key, signatureData);

    // Convert to hex string
    const signatureArray = new Uint8Array(hmacSignature);
    const hexSignature = Array.from(signatureArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures in constant time to prevent timing attacks
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

// Function to process payment splits and update wallets
async function processPaymentSplit(eventData: any) {
  try {
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, customer_id, seller_id, seller_type, total, delivery_agent_id')
      .eq('order_number', eventData.reference)
      .single();

    if (!orderData) {
      console.error(`Order not found for reference: ${eventData.reference}`);
      return { success: false, message: 'Order not found' };
    }

    if (!orderData.delivery_agent_id) {
      console.error(`No delivery agent assigned for order: ${eventData.reference}`);
      return { success: false, message: 'No delivery agent assigned' };
    }

    // Calculate payment splits
    const totalAmount = parseFloat(eventData.amount) / 100; // Paystack sends amount in kobo
    const platformFee = totalAmount * PLATFORM_FEE_PERCENTAGE;
    const agentEarnings = totalAmount * AGENT_EARNINGS_PERCENTAGE;
    const foodAmount = totalAmount - platformFee - agentEarnings;

    // Update order status to paid
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        split_details: {
          total: totalAmount,
          food: foodAmount,
          platform_fee: platformFee,
          agent_earnings: agentEarnings,
          delivery_fee: platformFee + agentEarnings
        }
      })
      .eq('id', orderData.id);

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError);
      return { success: false, message: 'Failed to update order' };
    }

    // Credit agent's food wallet
    await supabase.rpc('update_agent_wallet', {
      p_agent_id: orderData.delivery_agent_id,
      p_wallet_type: 'food_wallet',
      p_amount: foodAmount,
      p_transaction_type: 'credit',
      p_reference_type: 'order',
      p_reference_id: orderData.id,
      p_description: `Payment for order ${eventData.reference} - food amount`
    });

    // Credit agent's earnings wallet
    await supabase.rpc('update_agent_wallet', {
      p_agent_id: orderData.delivery_agent_id,
      p_wallet_type: 'earnings_wallet',
      p_amount: agentEarnings,
      p_transaction_type: 'credit',
      p_reference_type: 'order',
      p_reference_id: orderData.id,
      p_description: `Payment for order ${eventData.reference} - agent earnings`
    });

    console.log(`Successfully processed payment split for order ${eventData.reference}`);
    return { success: true, message: 'Payment split processed successfully' };
  } catch (error) {
    console.error('Error processing payment split:', error);
    return { success: false, message: 'Error processing payment split', error: error.message };
  }
}

// Function to handle transfer status updates from Paystack
async function handleTransferStatus(eventData: any) {
  try {
    const transferReference = eventData.transfer.transfer_code;

    // Update withdrawal status based on transfer status
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

  // Verify webhook signature
  if (!signature || !await verifyPaystackSignature(payload, signature)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const event = JSON.parse(payload);

    switch (event.event) {
      case 'charge.success':
        // Process successful payment and split funds
        const result = await processPaymentSplit(event.data);
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        });

      case 'transfer.success':
      case 'transfer.failed':
        // Handle transfer status updates
        const transferResult = await handleTransferStatus(event);
        return new Response(JSON.stringify(transferResult), {
          status: transferResult.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        // Unhandled event type
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

// Start the server
serve(handleWebhook, { port: 8000 });
