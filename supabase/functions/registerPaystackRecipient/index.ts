import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ CORS headers (required for local testing & cross-origin)
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// 🔑 Get secrets — MUST be set in Supabase Functions Env Vars
const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (!PAYSTACK_SECRET || !SUPABASE_SERVICE_ROLE) {
    throw new Error("Missing required env vars");
}

// ✅ Use Service Role key for DB writes (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders, status: 200 });
    }

    try {
        // 🔐 Authenticate user
        const authHeader = req.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) throw new Error("Missing auth token");

        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) throw new Error("Invalid token");

        // 📥 Parse input
        const { agent_user_id } = await req.json();
        if (agent_user_id !== user.id) throw new Error("User ID mismatch");

        // 🏦 Fetch bank profile
        const { data: profile, error: profileErr } = await supabase
            .from("agent_payout_profiles")
            .select("account_number, bank_code")
            .eq("user_id", agent_user_id)
            .single();

        if (profileErr || !profile) throw new Error("Bank details not found");

        // 🧾 Resolve account (optional but recommended)
        const resolveRes = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${profile.account_number}&bank_code=${profile.bank_code}`,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
            }
        );
        const resolveData = await resolveRes.json();
        const accountName = resolveData?.data?.account_name || `Agent ${agent_user_id.slice(0, 8)}`;

        // 📤 Create Paystack recipient
        const createRes = await fetch("https://api.paystack.co/transferrecipient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "nuban",
                name: accountName,
                account_number: profile.account_number,
                bank_code: profile.bank_code,
                currency: "NGN",
            }),
        });

        const createData = await createRes.json();
        if (!createRes.ok || !createData?.data?.recipient_code) {
            console.error("Paystack error:", createData);
            throw new Error(createData?.message || "Failed to create recipient");
        }

        const { recipient_code } = createData.data;

        // ✅ CRITICAL: Save recipient_code to DB
        const { error: updateErr } = await supabase
            .from("agent_payout_profiles")
            .update({ recipient_code })
            .eq("user_id", agent_user_id);

        if (updateErr) {
            console.error("DB update failed:", updateErr);
            throw new Error("Failed to store recipient code");
        }

        // ✅ Success
        return new Response(
            JSON.stringify({ success: true, recipient_code }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Edge function error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message || "Internal error" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
