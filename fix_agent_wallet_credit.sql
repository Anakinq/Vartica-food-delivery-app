Error while running migration: the backfill failed because public.delivery_agents does not have a column named delivery_earnings.

I used delivery_earnings based on some functions, but the schema shows delivery_earnings exists on agent_wallets (and some functions previously updated delivery_agents.delivery_earnings incorrectly). The failed statement is the backfill SELECT:

SELECT id as agent_id, delivery_earnings FROM public.delivery_agents WHERE COALESCE(delivery_earnings,0) > 0;

Fix options (pick one):

Backfill from wallet_transactions history — safer if delivery amounts were recorded there (wallet_transactions has wallet_type like 'earnings_wallet' and transaction rows). I can aggregate wallet_transactions to compute current earnings per agent and upsert into agent_wallets. Recommended.
If you want to preserve any values that might exist in delivery_agents in a different column (e.g., total_deliveries or rating) — confirm which column holds mistaken earnings (I didn't find delivery_earnings on delivery_agents).
Skip backfill and only create idempotent function + trigger. You can run a custom backfill later.
Recommended immediate correction: I'll proceed with the migration but replace the backfill step with an aggregation from public.wallet_transactions where wallet_type = 'earnings_wallet' AND reference_type != 'migration' (so we migrate historical credits recorded in transactions into agent_wallets if agent_wallets is missing or zero). This avoids relying on a non-existent column.

Please confirm you want me to:

Retry migration now with the backfill sourced from wallet_transactions aggregation (recommended), or
Retry but skip backfill and only deploy the function + trigger.
If you confirm, I will run the corrected migration.



-- ============================================================================
-- Agent Wallet Credit Fix - Single Source of Truth
-- Run this SQL in your Supabase SQL Editor to fix the wallet credit issue
-- ============================================================================

BEGIN;

-- 1) Create security-definer function to credit agent_wallets idempotently
CREATE OR REPLACE FUNCTION public.credit_agent_wallets_idempotent(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order record;
  v_agent_id uuid;
  v_food_amount numeric := 0;
  v_earnings_amount numeric := 0;
  v_already_food boolean;
  v_already_earnings boolean;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  -- Only proceed for paid orders with a delivery agent
  IF v_order.payment_status IS DISTINCT FROM 'paid' THEN
    RAISE NOTICE 'Order % not paid; skipping credit', p_order_id;
    RETURN;
  END IF;
  IF v_order.delivery_agent_id IS NULL THEN
    RAISE NOTICE 'Order % has no delivery agent; skipping credit', p_order_id;
    RETURN;
  END IF;

  v_agent_id := v_order.delivery_agent_id;
  v_food_amount := COALESCE(v_order.subtotal,0);
  v_earnings_amount := COALESCE(v_order.agent_earnings,0);

  -- Idempotency checks: have we already credited these wallet types for this order?
  SELECT EXISTS(SELECT 1 FROM public.wallet_transactions WHERE agent_id = v_agent_id AND reference_type = 'order' AND reference_id = p_order_id::text AND wallet_type = 'food_wallet') INTO v_already_food;
  SELECT EXISTS(SELECT 1 FROM public.wallet_transactions WHERE agent_id = v_agent_id AND reference_type = 'order' AND reference_id = p_order_id::text AND wallet_type = 'earnings_wallet') INTO v_already_earnings;

  -- Credit food wallet if amount > 0 and not already credited
  IF v_food_amount > 0 AND NOT v_already_food THEN
    INSERT INTO public.agent_wallets (agent_id, food_wallet_balance, updated_at)
    VALUES (v_agent_id, v_food_amount, now())
    ON CONFLICT (agent_id) DO UPDATE
    SET food_wallet_balance = COALESCE(agent_wallets.food_wallet_balance,0) + EXCLUDED.food_wallet_balance,
        updated_at = now();

    INSERT INTO public.wallet_transactions (agent_id, transaction_type, amount, wallet_type, reference_type, reference_id, description)
    VALUES (v_agent_id, 'credit', v_food_amount, 'food_wallet', 'order', p_order_id::text, 'Food funding for order ' || v_order.order_number);
  END IF;

  -- Credit earnings wallet if amount > 0 and not already credited
  IF v_earnings_amount > 0 AND NOT v_already_earnings THEN
    INSERT INTO public.agent_wallets (agent_id, earnings_wallet_balance, updated_at)
    VALUES (v_agent_id, v_earnings_amount, now())
    ON CONFLICT (agent_id) DO UPDATE
    SET earnings_wallet_balance = COALESCE(agent_wallets.earnings_wallet_balance,0) + EXCLUDED.earnings_wallet_balance,
        updated_at = now();

    INSERT INTO public.wallet_transactions (agent_id, transaction_type, amount, wallet_type, reference_type, reference_id, description)
    VALUES (v_agent_id, 'credit', v_earnings_amount, 'earnings_wallet', 'order', p_order_id::text, 'Delivery earnings for order ' || v_order.order_number);
  END IF;

  RETURN;
END;
$$;

-- 2) Replace existing trigger(s) to call this function when payment_status becomes 'paid'
-- Drop old triggers that call credit functions known to mutate wallets
DROP TRIGGER IF EXISTS trigger_credit_agent_wallet ON public.orders;
DROP TRIGGER IF EXISTS trigger_credit_agent_wallet_on_accept ON public.orders;
DROP TRIGGER IF EXISTS trigger_credit_agent_on_delivery ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_agent_wallet_on_delivery ON public.orders;

-- Create a new trigger function that calls the idempotent function when payment_status transitions to 'paid'
CREATE OR REPLACE FUNCTION public.orders_credit_on_paid_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Call only when payment_status transitions to 'paid'
  IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid') OR (TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid')) THEN
    PERFORM public.credit_agent_wallets_idempotent(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Attach the trigger (fires AFTER insert/update for safety)
DROP TRIGGER IF EXISTS orders_credit_on_paid ON public.orders;
CREATE TRIGGER orders_credit_on_paid
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_credit_on_paid_trigger();

-- 3) Backfill from wallet_transactions - aggregate credits into agent_wallets
-- This migrates historical earnings from wallet_transactions to agent_wallets

-- Create temp table of earnings from transactions
CREATE TEMP TABLE tmp_earnings_from_transactions AS
SELECT 
    agent_id,
    SUM(amount) as total_earnings
FROM public.wallet_transactions
WHERE wallet_type = 'earnings_wallet' 
    AND transaction_type = 'credit'
    AND (reference_type != 'migration' OR reference_type IS NULL)
GROUP BY agent_id;

-- Upsert earnings into agent_wallets where current balance is 0 or NULL
INSERT INTO public.agent_wallets (agent_id, earnings_wallet_balance, updated_at)
SELECT 
    t.agent_id, 
    t.total_earnings, 
    now()
FROM tmp_earnings_from_transactions t
LEFT JOIN public.agent_wallets aw ON aw.agent_id = t.agent_id
WHERE aw.agent_id IS NULL OR COALESCE(aw.earnings_wallet_balance, 0) = 0
ON CONFLICT (agent_id) DO UPDATE SET
    earnings_wallet_balance = COALESCE(agent_wallets.earnings_wallet_balance, 0) + t.total_earnings,
    updated_at = now();

-- Record migration transactions for audit
INSERT INTO public.wallet_transactions (agent_id, transaction_type, amount, wallet_type, reference_type, reference_id, description)
SELECT 
    t.agent_id,
    'credit',
    t.total_earnings,
    'earnings_wallet',
    'migration',
    NULL,
    'Migrated earnings from wallet_transactions'
FROM tmp_earnings_from_transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM public.wallet_transactions wt 
    WHERE wt.agent_id = t.agent_id 
    AND wt.reference_type = 'migration' 
    AND wt.description LIKE 'Migrated earnings from wallet_transactions%'
);

COMMIT;

-- Verify the fix
SELECT 'Migration completed!' as status;
