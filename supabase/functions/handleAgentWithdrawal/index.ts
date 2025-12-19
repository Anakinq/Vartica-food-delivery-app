import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 });
    }

    try {
        // Get environment variables inside handler
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !PAYSTACK_SECRET_KEY) {
            throw new Error("Missing required environment variables");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
        // Verify JWT token
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { agent_id, amount_kobo, type } = await req.json();
        const amount = amount_kobo / 100;

        // Get agent’s user_id from delivery_agents
        const { data: agent, error: agentErr } = await supabase
            .from("delivery_agents")
            .select("user_id")
            .eq("id", agent_id)
            .single();
        if (agentErr || !agent) {
            return new Response(
                JSON.stringify({ error: "Agent not found" }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get wallet & payout profile
        const [walletRes, payoutRes] = await Promise.all([
            supabase.from("agent_wallets").select("*").eq("agent_id", agent_id).single(),
            supabase.from("agent_payout_profiles").select("recipient_code").eq("user_id", agent.user_id).single(),
        ]);

        if (!walletRes.data) {
            return new Response(
                JSON.stringify({ error: "Wallet not initialized" }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!payoutRes.data?.recipient_code) {
            return new Response(
                JSON.stringify({ error: "Bank not verified" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { customer_funds, delivery_earnings } = walletRes.data;
        const available = type === "customer_funds" ? customer_funds : delivery_earnings;

        if (amount > available) {
            return new Response(
                JSON.stringify({ error: `Insufficient ${type}. Available: ₦${available.toFixed(2)}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Deduct from wallet
        const { error: deductErr } = await supabase.rpc("deduct_agent_wallet", {
            p_agent_id: agent_id,
            p_amount: amount,
            p_type: type,
        });
        if (deductErr) {
            return new Response(
                JSON.stringify({ error: "Wallet deduction failed" }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Paystack transfer
        const paystackRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                source: "balance",
                amount: amount_kobo,
                recipient: payoutRes.data.recipient_code,
                reason: `Withdrawal: ${type}`,
            }),
        });

        const transfer = await paystackRes.json();
        if (!transfer.status) {
            // Rollback on failure
            await supabase.rpc("revert_agent_wallet_deduction", {
                p_agent_id: agent_id,
                p_amount: amount,
                p_type: type,
            });
            return new Response(
                JSON.stringify({ error: transfer.message || "Transfer failed" }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Record success
        await supabase.from("withdrawals").insert({
            agent_id,
            amount,
            type,
            status: "completed",
        });

        return new Response(
            JSON.stringify({ success: true, transfer_code: transfer.data.reference }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});