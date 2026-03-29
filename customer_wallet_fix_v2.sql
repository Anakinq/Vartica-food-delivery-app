-- ============================================================
-- CUSTOMER WALLET SYSTEM - COMPLETE FIX
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: Create customer_wallets table
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customer_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own wallet" ON customer_wallets;
DROP POLICY IF EXISTS "Service role can manage customer wallets" ON customer_wallets;

CREATE POLICY "Users can view own wallet"
    ON customer_wallets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role can manage customer wallets"
    ON customer_wallets FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create index
DROP INDEX IF EXISTS idx_customer_wallets_user_id;
CREATE INDEX idx_customer_wallets_user_id ON customer_wallets(user_id);

-- ============================================================
-- PART 2: Create customer_wallet_transactions table
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    payment_reference VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customer_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON customer_wallet_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON customer_wallet_transactions;

CREATE POLICY "Users can view own transactions"
    ON customer_wallet_transactions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role can manage transactions"
    ON customer_wallet_transactions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create indexes
DROP INDEX IF EXISTS idx_customer_wallet_transactions_user_id;
DROP INDEX IF EXISTS idx_customer_wallet_transactions_order_id;
DROP INDEX IF EXISTS idx_customer_wallet_transactions_created_at;
CREATE INDEX idx_customer_wallet_transactions_user_id ON customer_wallet_transactions(user_id);
CREATE INDEX idx_customer_wallet_transactions_order_id ON customer_wallet_transactions(order_id);
CREATE INDEX idx_customer_wallet_transactions_created_at ON customer_wallet_transactions(created_at DESC);

-- ============================================================
-- PART 3: Add columns to orders table for refund & verification
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_pin VARCHAR(4);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- ============================================================
-- PART 4: Grant permissions
-- ============================================================
GRANT ALL ON customer_wallets TO authenticated;
GRANT ALL ON customer_wallets TO service_role;
GRANT ALL ON customer_wallets TO anon;

GRANT ALL ON customer_wallet_transactions TO authenticated;
GRANT ALL ON customer_wallet_transactions TO service_role;
GRANT ALL ON customer_wallet_transactions TO anon;

GRANT ALL ON orders TO authenticated;
GRANT ALL ON orders TO service_role;
GRANT ALL ON orders TO anon;

-- ============================================================
-- PART 5: Create trigger to auto-create wallet on profile creation
-- ============================================================
DROP TRIGGER IF EXISTS trigger_create_customer_wallet ON profiles;
DROP FUNCTION IF EXISTS create_customer_wallet_on_signup;

CREATE OR REPLACE FUNCTION create_customer_wallet_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customer_wallets (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_customer_wallet
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_customer_wallet_on_signup();

-- ============================================================
-- PART 6: Seed existing users with wallets
-- ============================================================
INSERT INTO customer_wallets (user_id, balance)
SELECT id, 0
FROM profiles
WHERE NOT EXISTS (
    SELECT 1 FROM customer_wallets WHERE customer_wallets.user_id = profiles.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- PART 7: RPC FUNCTIONS
-- ============================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS public.top_up_wallet(UUID, DECIMAL(12, 2), VARCHAR(255), TEXT);
DROP FUNCTION IF EXISTS public.deduct_wallet_balance(UUID, DECIMAL(12, 2), UUID, TEXT);
DROP FUNCTION IF EXISTS public.refund_order_to_wallet(UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_customer_wallet(UUID);
DROP FUNCTION IF EXISTS public.get_customer_transactions(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_order_transaction(UUID);
DROP FUNCTION IF EXISTS public.generate_delivery_pin(UUID);
DROP FUNCTION IF EXISTS public.verify_delivery_pin(UUID, VARCHAR);

-- FUNCTION: Top Up Wallet (Credit)
CREATE OR REPLACE FUNCTION public.top_up_wallet(
    p_user_id UUID,
    p_amount DECIMAL(12, 2),
    p_payment_reference VARCHAR(255),
    p_description TEXT DEFAULT 'Wallet top-up'
)
RETURNS TABLE(
    success BOOLEAN,
    new_balance DECIMAL(12, 2),
    transaction_id UUID
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_before DECIMAL(12, 2);
    v_balance_after DECIMAL(12, 2);
    v_transaction_id UUID;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Get or create wallet
    SELECT id, COALESCE(balance, 0) INTO v_wallet_id, v_balance_before
    FROM customer_wallets
    WHERE user_id = p_user_id;

    IF v_wallet_id IS NULL THEN
        INSERT INTO customer_wallets (user_id, balance, created_at, updated_at)
        VALUES (p_user_id, 0, NOW(), NOW())
        RETURNING id INTO v_wallet_id;
        v_balance_before := 0;
    END IF;

    -- Update balance
    v_balance_after := v_balance_before + p_amount;
    UPDATE customer_wallets
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Record transaction
    INSERT INTO customer_wallet_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        payment_reference, description
    ) VALUES (
        p_user_id, 'credit', p_amount, v_balance_before, v_balance_after,
        p_payment_reference, p_description
    )
    RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT true, v_balance_after, v_transaction_id;
END;
$$;

-- FUNCTION: Deduct Wallet Balance (Debit)
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
    p_user_id UUID,
    p_amount DECIMAL(12, 2),
    p_order_id UUID,
    p_description TEXT DEFAULT 'Order payment'
)
RETURNS TABLE(
    success BOOLEAN,
    new_balance DECIMAL(12, 2),
    transaction_id UUID
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_before DECIMAL(12, 2);
    v_balance_after DECIMAL(12, 2);
    v_transaction_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    SELECT id, COALESCE(balance, 0) INTO v_wallet_id, v_balance_before
    FROM customer_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user';
    END IF;

    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    v_balance_after := v_balance_before - p_amount;
    UPDATE customer_wallets
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = v_wallet_id;

    INSERT INTO customer_wallet_transactions (
        user_id, order_id, transaction_type, amount, balance_before, balance_after,
        description
    ) VALUES (
        p_user_id, p_order_id, 'debit', p_amount, v_balance_before, v_balance_after,
        p_description
    )
    RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT true, v_balance_after, v_transaction_id;
END;
$$;

-- FUNCTION: Refund Order to Wallet
CREATE OR REPLACE FUNCTION public.refund_order_to_wallet(
    p_order_id UUID,
    p_refund_reason TEXT DEFAULT 'Order cancelled/returned'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    refunded_amount DECIMAL(12, 2)
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_order RECORD;
    v_user_id UUID;
    v_amount DECIMAL(12, 2);
    v_wallet_id UUID;
    v_balance_before DECIMAL(12, 2);
    v_balance_after DECIMAL(12, 2);
    v_transaction_id UUID;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RETURN QUERY SELECT false, 'Order not found', 0::DECIMAL(12, 2);
    END IF;

    IF v_order.refunded_at IS NOT NULL THEN
        RETURN QUERY SELECT false, 'Order already refunded', 0::DECIMAL(12, 2);
    END IF;

    IF v_order.payment_status != 'paid' THEN
        RETURN QUERY SELECT false, 'Order not paid', 0::DECIMAL(12, 2);
    END IF;

    v_user_id := v_order.customer_id;
    v_amount := v_order.total;

    SELECT id, COALESCE(balance, 0) INTO v_wallet_id, v_balance_before
    FROM customer_wallets
    WHERE user_id = v_user_id;

    IF v_wallet_id IS NULL THEN
        INSERT INTO customer_wallets (user_id, balance, created_at, updated_at)
        VALUES (v_user_id, 0, NOW(), NOW())
        RETURNING id INTO v_wallet_id;
        v_balance_before := 0;
    END IF;

    v_balance_after := v_balance_before + v_amount;
    UPDATE customer_wallets
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = v_wallet_id;

    INSERT INTO customer_wallet_transactions (
        user_id, order_id, transaction_type, amount, balance_before, balance_after,
        description
    ) VALUES (
        v_user_id, p_order_id, 'refund', v_amount, v_balance_before, v_balance_after,
        p_refund_reason
    )
    RETURNING id INTO v_transaction_id;

    UPDATE orders
    SET refunded_at = NOW(), payment_status = 'refunded'
    WHERE id = p_order_id;

    RETURN QUERY SELECT true, 'Refund successful', v_amount;
END;
$$;

-- FUNCTION: Get Customer Wallet
CREATE OR REPLACE FUNCTION public.get_customer_wallet(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    balance DECIMAL(12, 2),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT cw.id, cw.user_id, cw.balance, cw.created_at, cw.updated_at
    FROM customer_wallets cw
    WHERE cw.user_id = p_user_id;
END;
$$;

-- FUNCTION: Get Customer Transaction History
CREATE OR REPLACE FUNCTION public.get_customer_transactions(
    p_user_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
) RETURNS TABLE(
    id UUID,
    order_id UUID,
    transaction_type TEXT,
    amount DECIMAL(12, 2),
    balance_before DECIMAL(12, 2),
    balance_after DECIMAL(12, 2),
    payment_reference VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cwt.id,
        cwt.order_id,
        cwt.transaction_type,
        cwt.amount,
        cwt.balance_before,
        cwt.balance_after,
        cwt.payment_reference,
        cwt.description,
        cwt.created_at
    FROM customer_wallet_transactions cwt
    WHERE cwt.user_id = p_user_id
    ORDER BY cwt.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- FUNCTION: Generate Delivery PIN
CREATE OR REPLACE FUNCTION public.generate_delivery_pin(p_order_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    delivery_pin VARCHAR(4)
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_pin VARCHAR(4);
    v_order_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM orders WHERE id = p_order_id) INTO v_order_exists;

    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, NULL::VARCHAR;
    END IF;

    v_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    UPDATE orders
    SET delivery_pin = v_pin
    WHERE id = p_order_id;

    RETURN QUERY SELECT true, v_pin;
END;
$$;

-- FUNCTION: Verify Delivery PIN
CREATE OR REPLACE FUNCTION public.verify_delivery_pin(
    p_order_id UUID,
    p_pin VARCHAR(4)
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM orders 
        WHERE id = p_order_id 
        AND delivery_pin = p_pin
    ) INTO v_valid;

    RETURN COALESCE(v_valid, false);
END;
$$;

-- ============================================================
-- PART 8: Grant execute permissions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.top_up_wallet(UUID, DECIMAL(12, 2), VARCHAR(255), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.top_up_wallet(UUID, DECIMAL(12, 2), VARCHAR(255), TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, DECIMAL(12, 2), UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, DECIMAL(12, 2), UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_order_to_wallet(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_order_to_wallet(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_wallet(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_transactions(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_transactions(UUID, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_delivery_pin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_delivery_pin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_delivery_pin(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_delivery_pin(UUID, VARCHAR) TO service_role;

-- ============================================================
-- Verification
-- ============================================================
SELECT '=== VERIFICATION ===' as info;

SELECT 'Tables created:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('customer_wallets', 'customer_wallet_transactions');

SELECT 'Wallet columns:' as info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_wallets'
ORDER BY ordinal_position;

SELECT 'Functions created:' as info, routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN (
    'top_up_wallet', 'deduct_wallet_balance', 'refund_order_to_wallet',
    'get_customer_wallet', 'get_customer_transactions', 'generate_delivery_pin', 'verify_delivery_pin'
);

SELECT '✅ Database setup complete!' as info;