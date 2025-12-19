// /api/paystack-webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key (full permissions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Paystack signature
  const signature = req.headers['x-paystack-signature'] as string;
  const payload = JSON.stringify(req.body);

  // Check if PAYSTACK_SECRET_KEY is configured
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    console.error('❌ PAYSTACK_SECRET_KEY not configured in environment variables');
    return res.status(500).json({ error: 'Payment system not configured' });
  }

  const expectedSignature = crypto
    .createHmac('sha512', paystackSecretKey)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('⚠️ Invalid Paystack webhook signature');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event, data } = req.body;

  // Only process successful payments
  if (event === 'charge.success') {
    const { reference, amount, customer } = data;
    const totalAmount = amount / 100; // convert kobo → naira

    try {
      // Fetch the pending order draft (if you save one before payment)
      // For now, we assume you’ll send minimal order context via frontend
      // But best practice: store order draft BEFORE payment, then update on success

      // ⚠️ Since your current flow doesn’t pre-save orders,
      // this webhook CANNOT know delivery address, items, etc.
      // So you MUST send order data from frontend to webhook

      // Therefore, we expect req.body to include `order` object
      const { order } = req.body;

      if (!order) {
        console.error('❌ No order data in webhook payload');
        return res.status(400).json({ error: 'Missing order data' });
      }

      const orderPayload = {
        user_id: order.user_id,
        seller_id: order.seller_id,
        seller_type: order.seller_type,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        discount: order.discount || 0,
        total: order.total,
        payment_method: 'online',
        payment_status: 'paid',
        payment_reference: reference,
        promo_code: order.promo_code || null,
        delivery_address: order.delivery_address,
        delivery_notes: order.delivery_notes || null,
        scheduled_for: order.scheduled_for || null,
        platform_commission: 300.0,
        agent_earnings: 200.0,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('orders').insert(orderPayload);
      if (error) throw error;

      console.log('✅ Order inserted via Paystack webhook:', reference);
      return res.status(200).json({ success: true, message: 'Order created' });
    } catch (err) {
      console.error('🔥 Webhook order insert error:', err);
      return res.status(500).json({ error: 'Failed to create order' });
    }
  }

  // Acknowledge other events (e.g., test events)
  return res.status(200).json({ received: true });
}