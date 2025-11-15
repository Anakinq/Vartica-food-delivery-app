import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "https://varticadelivery.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PUBLIC_ANON = Deno.env.get("SUPABASE_ANON_KEY");

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers: corsHeaders });
    }

    try {
        if (!PAYSTACK_SECRET || !SUPABASE_URL || !SERVICE_ROLE || !PUBLIC_ANON) {
            throw new Error("Missing environment variables");
        }

        // ❗ AUTH client → MUST use PUBLIC key
        const authClient = createClient(SUPABASE_URL, PUBLIC_ANON);

        // ❗ DB client → MUST use SERVICE ROLE
        const dbClient = createClient(SUPABASE_URL, SERVICE_ROLE);

        // Extract token
        const authHeader = req.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) throw new Error("Missing auth token");

        // Validate user
        const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
        if (authErr || !user) throw new Error("Invalid authentication");

        // Read request JSON
        const { agent_user_id } = await req.json();
        if (agent_user_id !== user.id) throw new Error("User ID mismatch");

        // Fetch payout profile
        const { data: profile, error: profileErr } = await dbClient
            .from("agent_payout_profiles")
            .select("account_number, bank_code")
            .eq("user_id", agent_user_id)
            .single();

        if (profileErr || !profile) throw new Error("Bank details not found");

        // Resolve bank account
        const resolveRes = await fetch(
            `https://api.paystack.co/bank/resolve?account_number=${profile.account_number}&bank_code=${profile.bank_code}`,
            {
                method: "GET",
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
            }
        );

        const resolveData = await resolveRes.json();

        // Check if bank resolution failed
        if (!resolveRes.ok || !resolveData.status) {
            const errorMsg = resolveData.message || 'Bank account validation failed';
            console.error('Paystack resolve error:', resolveData);
            throw new Error(errorMsg);
        }

        const accountName = resolveData.data?.account_name || `Agent ${agent_user_id.slice(0, 8)}`;

        // Create recipient
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
            throw new Error(createData?.message || "Failed to create Paystack recipient");
        }

        const { recipient_code } = createData.data;

        // Save to database (Service Role bypasses RLS)
        const { error: updateErr } = await dbClient
            .from("agent_payout_profiles")
            .update({ recipient_code })
            .eq("user_id", agent_user_id);

        if (updateErr) throw new Error("Failed to store recipient code");

        return new Response(
            JSON.stringify({ success: true, recipient_code }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("Function error:", err);
        return new Response(
            JSON.stringify({ success: false, error: err.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
