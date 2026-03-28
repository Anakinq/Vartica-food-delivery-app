import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "supabase";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
    try {
        // Only allow POST requests
        if (req.method !== "POST") {
            return new Response(JSON.stringify({ error: "Method not allowed" }), {
                status: 405,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Create Supabase client with service role key (for admin access)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse request body
        const { user_id, amount, payment_reference, description } = await req.json();

        // Validate required fields
        if (!user_id || !amount || !payment_reference) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: user_id, amount, payment_reference" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        console.log(`Verifying wallet payment: user=${user_id}, amount=${amount}, ref=${payment_reference}`);

        // First, check if this payment reference has already been processed
        const { data: existingTx } = await supabase
            .from('customer_wallet_transactions')
            .select('id, amount, status')
            .eq('payment_reference', payment_reference)
            .eq('user_id', user_id)
            .in('type', ['credit', 'top_up', 'deposit'])
            .in('status', ['completed', 'success'])
            .limit(1)
            .single();

        if (existingTx) {
            // Transaction already processed - get current wallet balance
            const { data: wallet } = await supabase
                .from('customer_wallets')
                .select('balance')
                .eq('user_id', user_id)
                .single();

            console.log(`Payment reference ${payment_reference} already processed`);

            return new Response(
                JSON.stringify({
                    success: true,
                    already_processed: true,
                    new_balance: wallet?.balance || 0,
                    transaction_id: existingTx.id,
                    message: "Transaction already processed"
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Call the top_up_wallet RPC function
        const { data, error } = await supabase.rpc('top_up_wallet', {
            p_user_id: user_id,
            p_amount: amount,
            p_payment_reference: payment_reference,
            p_description: description || 'Wallet top-up via Paystack'
        });

        if (error) {
            console.error("RPC error:", error);
            return new Response(
                JSON.stringify({ success: false, error: error.message }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Parse the RPC response
        if (data && data.length > 0) {
            const result = data[0];

            if (result.success) {
                console.log(`Wallet top-up successful: new_balance=${result.new_balance}, transaction_id=${result.transaction_id}`);

                return new Response(
                    JSON.stringify({
                        success: true,
                        already_processed: false,
                        new_balance: parseFloat(result.new_balance),
                        transaction_id: result.transaction_id
                    }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            } else {
                console.error("Top-up failed:", result);

                return new Response(
                    JSON.stringify({
                        success: false,
                        error: result.error || "Top-up failed"
                    }),
                    {
                        status: 400,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }
        }

        // Unexpected response format
        console.error("Unexpected RPC response:", data);
        return new Response(
            JSON.stringify({ success: false, error: "Unexpected response from server" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        console.error("Function error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
});