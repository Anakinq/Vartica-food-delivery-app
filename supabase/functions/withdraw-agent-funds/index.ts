import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

interface WithdrawRequest {
  user_id: string;
  amount_kobo: number;
  type: 'customer_funds' | 'delivery_earnings';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { user_id, amount_kobo, type }: WithdrawRequest = await req.json();
    const amount_naira = amount_kobo / 100;

    // Validate input
    if (!user_id || !amount_kobo || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, amount_kobo, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount_kobo <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be positive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Init Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure requester owns this user_id
    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: user_id mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get bank info
    const { data: bankProfile, error: bankError } = await supabase
      .from('agent_payout_profiles')
      .select('account_number, bank_code')
      .eq('user_id', user_id)
      .single();

    if (bankError || !bankProfile) {
      return new Response(
        JSON.stringify({ 
          error: 'Bank details not found. Please save your account info first.',
          details: bankError?.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate available balance (same logic as frontend)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Use UTC for consistency

    let availableBalanceKobo = 0;

    if (type === 'customer_funds') {
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('delivery_agent_id', user_id)
        .eq('payment_status', 'paid')
        .gte('created_at', today.toISOString());
      
      const total = paidOrders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
      availableBalanceKobo = Math.round(total * 100);
    } else {
      const { data: deliveredOrders } = await supabase
        .from('orders')
        .select('agent_earnings')
        .eq('delivery_agent_id', user_id)
        .eq('status', 'delivered')
        .gte('created_at', today.toISOString());
      
      const earnings = deliveredOrders?.reduce((sum: number, o: any) => sum + (o.agent_earnings || 200), 0) || 0;
      availableBalanceKobo = Math.round(earnings * 100);
    }

    if (amount_kobo > availableBalanceKobo) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient funds',
          available: availableBalanceKobo / 100,
          requested: amount_naira
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Call Paystack Transfer
    const paystackRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        reason: type === 'customer_funds' 
          ? 'Food purchase funds' 
          : 'Delivery earnings payout',
        amount: amount_kobo,
        recipient: {
          type: 'nuban',
          name: `Agent ${user_id.slice(0, 8)}`,
          account_number: bankProfile.account_number,
          bank_code: bankProfile.bank_code,
          currency: 'NGN'
        }
      })
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack error:', paystackData);
      return new Response(
        JSON.stringify({ 
          error: 'Payout failed',
          details: paystackData.message || 'Unknown Paystack error'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Success
    return new Response(
      JSON.stringify({
        success: true,
        transfer_code: paystackData.data?.transfer_code,
        amount_withdrawn: amount_naira
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});