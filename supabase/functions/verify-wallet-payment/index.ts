import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables with proper fallbacks and validation
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || Deno.env.get("PAYSTACK_SECRET");
const PROJECT_URL = Deno.env.get("PROJECT_URL") || Deno.env.get("SUPABASE_URL");
const PROJECT_SERVICE_KEY = Deno.env.get("PROJECT_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Skip auth verification - allow all requests for payment processing
  // NOTE: In production, you'd want to verify the request in other ways

  console.log("=== Edge Function invoked ===");
  console.log("Method:", req.method);

  // Log environment status
  console.log("Environment check:");
  console.log("  PAYSTACK_SECRET_KEY:", PAYSTACK_SECRET_KEY ? "SET (length: " + PAYSTACK_SECRET_KEY.length + ")" : "NOT SET");
  console.log("  PROJECT_URL:", PROJECT_URL || "NOT SET");
  console.log("  PROJECT_SERVICE_KEY:", PROJECT_SERVICE_KEY ? "SET (length: " + PROJECT_SERVICE_KEY.length + ")" : "NOT SET");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Check environment variables
  if (!PAYSTACK_SECRET_KEY || !PROJECT_URL || !PROJECT_SERVICE_KEY) {
    const missing = [];
    if (!PAYSTACK_SECRET_KEY) missing.push("PAYSTACK_SECRET_KEY");
    if (!PROJECT_URL) missing.push("PROJECT_URL");
    if (!PROJECT_SERVICE_KEY) missing.push("PROJECT_SERVICE_KEY");

    console.error("Missing env vars:", missing);

    return new Response(
      JSON.stringify({
        error: "Server configuration error - missing: " + missing.join(", "),
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const rawBody = await req.json();
    console.log("Raw request body:", JSON.stringify(rawBody));

    // Handle both frontend invoke format AND direct fetch format
    let user_id: string | undefined;
    let amount: number | undefined;
    let payment_reference: string | undefined;
    let description: string | undefined;

    // Format 1: supabase.functions.invoke() wraps in 'body'
    if (rawBody.body) {
      user_id = rawBody.body.user_id;
      amount = rawBody.body.amount;
      payment_reference = rawBody.body.payment_reference;
      description = rawBody.body.description;
    }
    // Format 2: direct fetch - data at root level (what we just fixed)
    else if (rawBody.user_id) {
      user_id = rawBody.user_id;
      amount = rawBody.amount;
      payment_reference = rawBody.payment_reference;
      description = rawBody.description;
    }

    console.log("Parsed values:", { user_id, amount, payment_reference });

    if (!user_id || !amount || !payment_reference) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, amount, payment_reference", success: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate amount
    if (amount < 100) {
      return new Response(
        JSON.stringify({ error: "Minimum amount is ₦100", success: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase admin client
    const supabase = createClient(PROJECT_URL, PROJECT_SERVICE_KEY);

    // ========================================
    // STEP 1: Verify payment with Paystack
    // ========================================
    console.log(`Verifying Paystack payment: ${payment_reference}`);

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${payment_reference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackRes.json();
    console.log("Paystack response status:", paystackData.status);
    console.log("Paystack response data:", JSON.stringify(paystackData.data));

    if (!paystackData.status) {
      console.error("Paystack verification failed:", paystackData.message);
      return new Response(
        JSON.stringify({ success: false, error: "Payment verification failed: " + (paystackData.message || "Unknown error") }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentStatus = paystackData.data.status;
    if (paymentStatus !== "success") {
      console.error("Payment not successful:", paymentStatus);
      return new Response(
        JSON.stringify({ success: false, error: `Payment not completed. Status: ${paymentStatus}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify amount
    const paidAmount = paystackData.data.amount / 100;
    if (paidAmount < amount) {
      console.error("Amount mismatch. Expected:", amount, "Paid:", paidAmount);
      return new Response(
        JSON.stringify({ success: false, error: "Amount mismatch" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================
    // STEP 2: Check for duplicate transaction
    // ========================================
    console.log("Checking for duplicate transaction...");

    const { data: existingTransaction, error: dupCheckError } = await supabase
      .from("customer_wallet_transactions")
      .select("id")
      .eq("payment_reference", payment_reference)
      .single();

    console.log("Duplicate check result:", { existingTransaction, dupCheckError });

    if (dupCheckError && dupCheckError.code !== 'PGRST116') {
      console.error("Error checking duplicate:", dupCheckError);
    }

    if (existingTransaction) {
      console.log("Transaction already processed:", payment_reference);
      return new Response(
        JSON.stringify({ success: true, message: "Transaction already processed", already_processed: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================
    // STEP 3: Credit the wallet
    // ========================================
    console.log("Calling top_up_wallet RPC...");

    const { data: walletResult, error: walletError } = await supabase.rpc("top_up_wallet", {
      p_user_id: user_id,
      p_amount: amount,
      p_payment_reference: payment_reference,
      p_description: description || "Wallet top-up via Paystack",
    });

    console.log("Wallet RPC result:", walletResult);
    console.log("Wallet RPC error:", walletError);

    if (walletError) {
      console.error("Wallet credit error:", walletError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to credit wallet: " + walletError.message,
          hint: "Make sure customer_wallets table exists and top_up_wallet function is defined"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (walletResult && walletResult.length > 0) {
      const result = walletResult[0];
      console.log("RPC result object:", result);

      if (result.success) {
        console.log("✅ Wallet credited! New balance:", result.new_balance);
        return new Response(
          JSON.stringify({
            success: true,
            new_balance: result.new_balance,
            transaction_id: result.transaction_id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        console.error("RPC returned failure:", result);
        return new Response(
          JSON.stringify({ success: false, error: "Wallet credit failed" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "No result from wallet credit RPC" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("=== Unexpected error ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});