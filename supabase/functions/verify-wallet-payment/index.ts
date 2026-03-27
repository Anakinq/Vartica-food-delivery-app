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

  try {
    const { user_id, amount, payment_reference, description } = await req.json();

    if (!user_id || !amount || !payment_reference) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, amount, payment_reference" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate amount
    if (amount < 100) {
      return new Response(
        JSON.stringify({ error: "Minimum amount is ₦100" }),
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
    console.log("Paystack verification response:", JSON.stringify(paystackData));

    // Check if Paystack verification was successful
    if (!paystackData.status) {
      console.error("Paystack verification failed:", paystackData.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment verification failed: " + (paystackData.message || "Unknown error") 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check payment status
    const paymentStatus = paystackData.data.status;
    if (paymentStatus !== "success") {
      console.error("Payment not successful:", paymentStatus);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Payment not completed. Status: ${paymentStatus}` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the amount matches (Paystack returns in kobo)
    const paidAmount = paystackData.data.amount / 100; // Convert from kobo to Naira
    if (paidAmount < amount) {
      console.error("Amount mismatch. Expected:", amount, "Paid:", paidAmount);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Amount mismatch between request and payment" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================
    // STEP 2: Check for duplicate transaction
    // ========================================
    // Check if this reference was already used
    const { data: existingTransaction } = await supabase
      .from("customer_wallet_transactions")
      .select("id")
      .eq("payment_reference", payment_reference)
      .single();

    if (existingTransaction) {
      console.log("Transaction already processed:", payment_reference);
      // Return success but don't double-credit
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Transaction already processed",
          already_processed: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================
    // STEP 3: Credit the wallet
    // ========================================
    console.log("Payment verified. Crediting wallet for user:", user_id);

    const { data: walletResult, error: walletError } = await supabase.rpc("top_up_wallet", {
      p_user_id: user_id,
      p_amount: amount,
      p_payment_reference: payment_reference,
      p_description: description || "Wallet top-up via Paystack",
    });

    if (walletError) {
      console.error("Wallet credit error:", walletError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment verified but failed to credit wallet: " + walletError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check the result from the RPC function
    if (walletResult && walletResult.length > 0) {
      const result = walletResult[0];
      if (result.success) {
        console.log("Wallet credited successfully. New balance:", result.new_balance);
        
        return new Response(
          JSON.stringify({
            success: true,
            new_balance: result.new_balance,
            transaction_id: result.transaction_id,
            payment_verified: true,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        console.error("Wallet credit returned failure:", result);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Wallet credit failed" 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Unknown error during wallet credit" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});