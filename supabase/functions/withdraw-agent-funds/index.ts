/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="dom" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Withdraw Agent Funds function loaded");

interface WithdrawRequest {
  agent_id: string;
  amount_kobo: number;
  type: 'customer_funds' | 'delivery_earnings';
}

interface OrderWithTotal {
  total: number;
}

interface OrderWithEarnings {
  agent_earnings?: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const json: WithdrawRequest = await req.json();
    const { agent_id, amount_kobo, type } = json;
    const amount_naira = amount_kobo / 100;

    if (!agent_id || !amount_kobo || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (amount_kobo <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {  { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: agent, error: agentError } = await supabase
      .from('delivery_agents')
      .select('id, user_id')
      .eq('id', agent_id)
      .maybeSingle();

    if (agentError || !agent || agent.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Agent not found or unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const {  bankProfile, error: bankError } = await supabase
      .from('agent_payout_profiles')
      .select('account_number, bank_code')
      .eq('agent_id', agent_id)
      .maybeSingle();

    if (bankError || !bankProfile) {
      return new Response(JSON.stringify({ error: 'Bank details not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let availableBalanceKobo = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (type === 'customer_funds') {
      const {  paidOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('delivery_agent_id', agent_id)
        .eq('payment_status', 'paid')
        .gte('created_at', today.toISOString());
      
      const total = (paidOrders as OrderWithTotal[] | null)
        ?.reduce((sum: number, o: OrderWithTotal) => sum + o.total, 0) || 0;
      availableBalanceKobo = Math.round(total * 100);
    } else {
      const {  deliveredOrders } = await supabase
        .from('orders')
        .select('agent_earnings')
        .eq('delivery_agent_id', agent_id)
        .eq('status', 'delivered')
        .gte('created_at', today.toISOString());
      
      const earnings = (deliveredOrders as OrderWithEarnings[] | null)
        ?.reduce((sum: number, o: OrderWithEarnings) => sum + (o.agent_earnings || 200), 0) || 0;
      availableBalanceKobo = Math.round(earnings * 100);
    }

    if (amount_kobo > availableBalanceKobo) {
      return new Response(JSON.stringify({ error: 'Insufficient funds' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call Paystack
    const paystackRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        reason: type === 'customer_funds' ? 'Food purchase funds' : 'Delivery earnings',
        amount: amount_kobo,
        recipient: {
          type: 'nuban',
          name: `Agent ${agent_id.slice(0, 8)}`,
          account_number: bankProfile.account_number,
          bank_code: bankProfile.bank_code,
          currency: 'NGN'
        }
      })
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error('Paystack error:', paystackData);
      return new Response(JSON.stringify({ 
        error: 'Payout failed',
        details: paystackData.message || 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      transfer_code: paystackData.data?.transfer_code,
      amount_withdrawn: amount_naira
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});