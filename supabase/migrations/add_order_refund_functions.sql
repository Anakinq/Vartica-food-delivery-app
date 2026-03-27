-- Order Refund Logic Functions
-- Handles automatic refunds for order cancellations and returns

-- Function to check if order is eligible for refund
-- Returns true if: order not accepted by delivery agent OR order marked as returned
CREATE OR REPLACE FUNCTION public.is_order_refundable(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
    v_delivery_agent_id UUID;
    v_refund_status TEXT;
BEGIN
    -- Get order details
    SELECT status, delivery_agent_id, refund_status
    INTO v_status, v_delivery_agent_id, v_refund_status
    FROM orders
    WHERE id = p_order_id;

    -- Check if already refunded
    IF v_refund_status = 'refunded' THEN
        RETURN FALSE;
    END IF;

    -- Refundable if:
    -- 1. Order is pending (not accepted by delivery agent yet)
    -- 2. Order is 'returned' (delivery agent marked as returned)
    IF v_status IN ('pending', 'accepted', 'preparing') AND v_delivery_agent_id IS NULL THEN
        RETURN TRUE;
    END IF;

    IF v_status = 'returned' THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get refundable amount for an order
CREATE OR REPLACE FUNCTION public.get_order_refund_amount(p_order_id UUID)
RETURNS NUMERIC(12, 2) AS $$
DECLARE
    v_total NUMERIC(12, 2);
    v_refund_status TEXT;
BEGIN
    SELECT total, refund_status
    INTO v_total, v_refund_status
    FROM orders
    WHERE id = p_order_id;

    -- Return 0 if already refunded
    IF v_refund_status = 'refunded' THEN
        RETURN 0;
    END IF;

    RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main refund function with double-refund prevention
CREATE OR REPLACE FUNCTION public.process_order_refund(
    p_order_id UUID,
    p_reason TEXT DEFAULT 'Order cancellation'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    refunded_amount NUMERIC(12, 2)
) AS $$
DECLARE
    v_customer_id UUID;
    v_total NUMERIC(12, 2);
    v_current_status TEXT;
    v_refund_status TEXT;
    v_balance_before NUMERIC(12, 2);
    v_balance_after NUMERIC(12, 2);
BEGIN
    -- Get order details
    SELECT customer_id, total, status, refund_status
    INTO v_customer_id, v_total, v_current_status, v_refund_status
    FROM orders
    WHERE id = p_order_id;

    -- Check if order exists
    IF v_customer_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Order not found', 0::NUMERIC(12, 2);
        RETURN;
    END IF;

    -- Double refund prevention
    IF v_refund_status = 'refunded' THEN
        RETURN QUERY SELECT FALSE, 'Order already refunded', 0::NUMERIC(12, 2);
        RETURN;
    END IF;

    -- Check if order is in a refundable state
    -- Full refund if no delivery agent has accepted yet
    -- Partial/full refund if marked as returned
    IF v_current_status NOT IN ('pending', 'accepted', 'preparing', 'returned', 'cancelled') THEN
        RETURN QUERY SELECT FALSE, 'Order not eligible for refund', 0::NUMERIC(12, 2);
        RETURN;
    END IF;

    -- Get current wallet balance
    SELECT COALESCE(balance, 0) INTO v_balance_before
    FROM customer_wallets
    WHERE user_id = v_customer_id;

    -- Calculate refund amount (full amount)
    v_total := COALESCE(v_total, 0);

    -- Credit the wallet
    UPDATE customer_wallets
    SET balance = balance + v_total, updated_at = NOW()
    WHERE user_id = v_customer_id
    RETURNING balance INTO v_balance_after;

    -- Record transaction
    INSERT INTO customer_wallet_transactions (
        user_id,
        order_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        payment_reference
    ) VALUES (
        v_customer_id,
        p_order_id,
        'refund',
        v_total,
        v_balance_before,
        v_balance_after,
        p_reason,
        'REFUND_' || p_order_id::TEXT
    );

    -- Update order refund status
    UPDATE orders
    SET refund_status = 'refunded', updated_at = NOW()
    WHERE id = p_order_id;

    RETURN QUERY SELECT TRUE, 'Refund processed successfully', v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_order_refundable(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_refund_amount(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_order_refund(UUID, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_order_refundable(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_order_refund_amount(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_order_refund(UUID, TEXT) TO service_role;

-- Add refund_status column to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'refund_status'
    ) THEN
        ALTER TABLE orders ADD COLUMN refund_status TEXT DEFAULT NULL;
    END IF;
END
$$;