-- Auto-fix wallet balance based on transaction history
-- This recalculates the balance from all transactions and updates the wallet

-- Function to recalculate wallet balance from transactions
CREATE OR REPLACE FUNCTION fix_wallet_balance(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_calculated_balance DECIMAL(12, 2);
BEGIN
    -- Calculate balance from all credit and debit transactions
    SELECT COALESCE(
        SUM(CASE 
            WHEN transaction_type = 'credit' THEN amount 
            WHEN transaction_type = 'debit' THEN -amount
            WHEN transaction_type = 'refund' THEN amount
            ELSE 0 
        END), 0
    ) INTO v_calculated_balance
    FROM customer_wallet_transactions
    WHERE user_id = p_user_id;

    -- Update the wallet balance
    UPDATE customer_wallets
    SET balance = v_calculated_balance, updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Wallet balance updated to % for user %', v_calculated_balance, p_user_id;
END;
$$;

-- To use this function, run this with your user ID:
-- SELECT fix_wallet_balance('YOUR_USER_ID_HERE');

-- Or to fix ALL wallets (if there are issues):
-- UPDATE customer_wallets cw
-- SET balance = (
--     SELECT COALESCE(
--         SUM(CASE 
--             WHEN transaction_type = 'credit' THEN amount 
--             WHEN transaction_type = 'debit' THEN -amount
--             WHEN transaction_type = 'refund' THEN amount
--             ELSE 0 
--         END), 0
--     )
--     FROM customer_wallet_transactions
--     WHERE user_id = cw.user_id
-- ),
-- updated_at = NOW();