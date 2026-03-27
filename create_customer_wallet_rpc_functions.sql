-- ============================================================
-- CUSTOMER WALLET RPC FUNCTIONS
-- ============================================================
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- FUNCTION: Top Up Wallet (Credit)
-- ============================================================
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

-- ============================================================
-- FUNCTION: Deduct Wallet Balance (Debit for Order Payment)
-- ============================================================
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
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Get wallet with lock
    SELECT id, COALESCE(balance, 0) INTO v_wallet_id, v_balance_before
    FROM customer_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user';
    END IF;

    -- Check sufficient balance
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update balance
    v_balance_after := v_balance_before - p_amount;
    UPDATE customer_wallets
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Record transaction
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

-- ============================================================
-- FUNCTION: Refund Order to Wallet
-- ============================================================
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
    v_already_refunded BOOLEAN;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RETURN QUERY SELECT false, 'Order not found', 0::DECIMAL(12, 2);
    END IF;

    -- Check if already refunded (double refund prevention)
    IF v_order.refunded_at IS NOT NULL THEN
        RETURN QUERY SELECT false, 'Order already refunded', 0::DECIMAL(12, 2);
    END IF;

    -- Check if payment was made
    IF v_order.payment_status != 'paid' THEN
        RETURN QUERY SELECT false, 'Order not paid', 0::DECIMAL(12, 2);
    END IF;

    v_user_id := v_order.customer_id;
    v_amount := v_order.total;

    -- Get or create wallet
    SELECT id, COALESCE(balance, 0) INTO v_wallet_id, v_balance_before
    FROM customer_wallets
    WHERE user_id = v_user_id;

    IF v_wallet_id IS NULL THEN
        INSERT INTO customer_wallets (user_id, balance, created_at, updated_at)
        VALUES (v_user_id, 0, NOW(), NOW())
        RETURNING id INTO v_wallet_id;
        v_balance_before := 0;
    END IF;

    -- Update balance
    v_balance_after := v_balance_before + v_amount;
    UPDATE customer_wallets
    SET balance = v_balance_after, updated_at = NOW()
    WHERE id = v_wallet_id;

    -- Record transaction
    INSERT INTO customer_wallet_transactions (
        user_id, order_id, transaction_type, amount, balance_before, balance_after,
        description
    ) VALUES (
        v_user_id, p_order_id, 'refund', v_amount, v_balance_before, v_balance_after,
        p_refund_reason
    )
    RETURNING id INTO v_transaction_id;

    -- Mark order as refunded (prevent double refunds)
    UPDATE orders
    SET refunded_at = NOW(), payment_status = 'refunded'
    WHERE id = p_order_id;

    RETURN QUERY SELECT true, 'Refund successful', v_amount;
END;
$$;

-- ============================================================
-- FUNCTION: Get Customer Wallet
-- ============================================================
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

-- ============================================================
-- FUNCTION: Get Customer Transaction History
-- ============================================================
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

-- ============================================================
-- FUNCTION: Get Order Transaction Details
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_order_transaction(p_order_id UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    transaction_type TEXT,
    amount DECIMAL(12, 2),
    balance_before DECIMAL(12, 2),
    balance_after DECIMAL(12, 2),
    description TEXT,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cwt.id,
        cwt.user_id,
        cwt.transaction_type,
        cwt.amount,
        cwt.balance_before,
        cwt.balance_after,
        cwt.description,
        cwt.created_at
    FROM customer_wallet_transactions cwt
    WHERE cwt.order_id = p_order_id
    ORDER BY cwt.created_at DESC;
END;
$$;

-- ============================================================
-- FUNCTION: Generate Delivery PIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_delivery_pin(p_order_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    delivery_pin VARCHAR(4)
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_pin VARCHAR(4);
    v_order_exists BOOLEAN;
BEGIN
    -- Check if order exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE id = p_order_id) INTO v_order_exists;

    IF NOT v_order_exists THEN
        RETURN QUERY SELECT false, NULL::VARCHAR;
    END IF;

    -- Generate 4-digit PIN
    v_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Update order with PIN
    UPDATE orders
    SET delivery_pin = v_pin
    WHERE id = p_order_id;

    RETURN QUERY SELECT true, v_pin;
END;
$$;

-- ============================================================
-- FUNCTION: Verify Delivery PIN
-- ============================================================
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
-- Grant execute permissions to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.top_up_wallet(UUID, DECIMAL(12, 2), VARCHAR(255), TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, DECIMAL(12, 2), UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_order_to_wallet(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_transactions(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_transaction(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_delivery_pin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_delivery_pin(UUID, VARCHAR(4)) TO authenticated;

GRANT EXECUTE ON FUNCTION public.top_up_wallet(UUID, DECIMAL(12, 2), VARCHAR(255), TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, DECIMAL(12, 2), UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_order_to_wallet(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_wallet(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_transactions(UUID, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_order_transaction(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_delivery_pin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_delivery_pin(UUID, VARCHAR(4)) TO service_role;

-- Verification
SELECT 'Functions created successfully' as status;