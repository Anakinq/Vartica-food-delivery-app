import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const PROJECT_URL = Deno.env.get("PROJECT_URL")!;
const PROJECT_SERVICE_KEY = Deno.env.get("PROJECT_SERVICE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // ========================================
    // SECURITY: Add internal API key validation
    // Only allow calls with the correct internal key
    // ========================================
    const internalApiKey = req.headers.get("x-internal-api-key");
    const expectedApiKey = Deno.env.get("INTERNAL_API_KEY");

    // If INTERNAL_API_KEY is set in secrets, require it
    if (expectedApiKey && internalApiKey !== expectedApiKey) {
        return new Response(
            JSON.stringify({ error: "Invalid or missing API key" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        // Get authorization header for admin access
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Authorization required" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase admin client
        const supabase = createClient(PROJECT_URL, PROJECT_SERVICE_KEY);

        // ========================================
        // STEP 1: Get recent wallet transactions to see what's already recorded
        // ========================================
        console.log("Fetching recent wallet transactions...");

        const { data: existingTransactions, error: txError } = await supabase
            .from("customer_wallet_transactions")
            .select("payment_reference, amount, created_at")
            .eq("transaction_type", "credit")
            .order("created_at", { ascending: false })
            .limit(100);

        if (txError) {
            console.error("Error fetching transactions:", txError);
        }

        const existingRefs = new Set(
            (existingTransactions || [])
                .map((t: any) => t.payment_reference)
                .filter((ref: string) => ref && ref.startsWith("WALLET_"))
        );

        console.log(`Found ${existingRefs.size} existing wallet top-up transactions`);
        console.log("Existing references:", Array.from(existingRefs).slice(0, 10));

        // ========================================
        // STEP 2: Query Paystack for recent transactions
        // ========================================
        console.log("Querying Paystack for recent transactions...");

        // Paystack expects perPage and page parameters
        let allPaystackTransactions: any[] = [];
        let page = 1;
        let hasMore = true;

        // Get transactions from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

        while (hasMore && page <= 5) { // Limit to 5 pages to avoid timeout
            const paystackRes = await fetch(
                `https://api.paystack.co/transaction?perPage=50&page=${page}&from=${fromDate}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    },
                }
            );

            const paystackData = await paystackRes.json();

            if (!paystackData.status) {
                console.error("Paystack API error:", paystackData.message);
                break;
            }

            const transactions = paystackData.data || [];
            allPaystackTransactions = [...allPaystackTransactions, ...transactions];

            // Check if there are more pages
            hasMore = paystackData.meta?.has_next_page || false;
            page++;

            // Filter for wallet-related transactions (those with WALLET_ reference)
            if (transactions.length === 0) {
                break;
            }

            console.log(`Page ${page - 1}: Found ${transactions.length} transactions`);
        }

        console.log(`Total Paystack transactions: ${allPaystackTransactions.length}`);

        // ========================================
        // STEP 3: Find missing transactions
        // ========================================
        const walletTransactions = allPaystackTransactions.filter(
            (t: any) => t.reference && t.reference.startsWith("WALLET_")
        );

        console.log(`Wallet-related transactions in Paystack: ${walletTransactions.length}`);

        const missingTransactions = walletTransactions.filter(
            (t: any) => !existingRefs.has(t.reference) && t.status === "success"
        );

        console.log(`Missing transactions (not in our DB): ${missingTransactions.length}`);

        if (missingTransactions.length === 0) {
            return new Response(
                JSON.stringify({
                    message: "No missing transactions found",
                    existing_count: existingRefs.size,
                    paystack_wallet_count: walletTransactions.length
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ========================================
        // STEP 4: Credit the missing transactions
        // ========================================
        console.log("Crediting missing transactions...");

        const results = [];

        for (const tx of missingTransactions) {
            try {
                const amount = tx.amount / 100; // Convert from kobo
                const reference = tx.reference;
                const customerEmail = tx.customer?.email;

                console.log(`Processing: ${reference} - ₦${amount} - ${customerEmail}`);

                // Find the user by email
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("id, email")
                    .eq("email", customerEmail)
                    .single();

                if (!profile) {
                    console.log(`User not found for email: ${customerEmail}`);
                    results.push({
                        reference,
                        amount,
                        status: "user_not_found",
                        email: customerEmail
                    });
                    continue;
                }

                console.log(`Found user: ${profile.id}`);

                // Credit the wallet using RPC
                const { data: creditResult, error: creditError } = await supabase.rpc("top_up_wallet", {
                    p_user_id: profile.id,
                    p_amount: amount,
                    p_payment_reference: reference,
                    p_description: `Wallet top-up via Paystack (recovered)`
                });

                if (creditError) {
                    console.error(`Error crediting wallet for ${reference}:`, creditError);
                    results.push({
                        reference,
                        amount,
                        status: "credit_failed",
                        error: creditError.message
                    });
                } else if (creditResult && creditResult[0]?.success) {
                    console.log(`Successfully credited ₦${amount} to user ${profile.id}`);
                    results.push({
                        reference,
                        amount,
                        user_id: profile.id,
                        status: "credited",
                        new_balance: creditResult[0].new_balance
                    });
                } else {
                    console.error(`Credit returned failure for ${reference}`);
                    results.push({
                        reference,
                        amount,
                        status: "credit_returned_failure"
                    });
                }
            } catch (err: any) {
                console.error(`Error processing ${tx.reference}:`, err);
                results.push({
                    reference: tx.reference,
                    status: "error",
                    error: err.message
                });
            }
        }

        // ========================================
        // Summary
        // ========================================
        const credited = results.filter((r: any) => r.status === "credited").length;
        const failed = results.filter((r: any) => r.status !== "credited").length;

        console.log(`Recovery complete: ${credited} credited, ${failed} failed`);

        return new Response(
            JSON.stringify({
                summary: {
                    total_missing: missingTransactions.length,
                    credited,
                    failed
                },
                details: results
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Unexpected error:", error);
        return new Response(
            JSON.stringify({
                error: error.message || "Internal server error"
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});