import { serve } from "https://deno.land/std@0.205.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

interface WithdrawRequest {
  amount_kobo: number;
  type: 'customer_funds' | 'delivery_earnings';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount_kobo, type }: WithdrawRequest = await req.json();
    const amount_naira = amount_kobo / 100;

    // Validate
    if (!amount_kobo || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing: amount_kobo, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (amount_kobo <= 0) {
      return new Response(
        JSON.stringify({ error: 'Amount must be positive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔑 Get agent_id from delivery_agents (using user.id)
    const {  agentRow } = await supabase
      .from('delivery_agents')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!agentRow) {
      return new Response(
        JSON.stringify({ error: 'Delivery agent profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const agent_id = agentRow.id;

    // Get bank
    const {  bankProfile } = await supabase
      .from('agent_payout_profiles')
      .select('account_number, bank_code')
      .eq('user_id', user.id)
      .single();

    if (!bankProfile) {
      return new Response(
        JSON.stringify({ error: 'Bank details not saved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 📊 Calculate balance (use agent_id for orders)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let availableBalanceKobo = 0;

    if (type === 'customer_funds') {
      const {  paidOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('delivery_agent_id', agent_id)
        .eq('payment_status', 'paid')
        .gte('created_at', today.toISOString());
      
      const total = paidOrders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
      availableBalanceKobo = Math.round(total * 100);
    } else {
      const {  deliveredOrders } = await supabase
        .from('orders')
        .select('agent_earnings')
        .eq('delivery_agent_id', agent_id)
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

    // 💸 Paystack Transfer (no trailing space!)
    const paystackRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        reason: type === 'customer_funds' 
          ? 'Food purchase' 
          : 'Delivery earnings',
        amount: amount_kobo,
        recipient: {
          type: 'nuban',
          name: `Agent ${user.id.slice(0, 8)}`,
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
          details: paystackData.message || 'Unknown error'
        }),
        { status: paystackRes.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        transfer_code: paystackData.data?.transfer_code,
        amount_withdrawn: amount_naira
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});