-- Wallet diagnostic and fix for therealvartica@gmail.com
-- User ID: c49693ac-307a-492c-b6ed-55ada1fb1fde
-- Run this in Supabase SQL Editor

-- Step 1: Check current wallet balance
SELECT 
    'Current Wallet Balance' as info,
    COALESCE(balance::text, 'No wallet found') as value,
    created_at as wallet_created,
    updated_at as last_updated
FROM customer_wallets 
WHERE user_id = 'c49693ac-307a-492c-b6ed-55ada1fb1fde';

-- Step 2: Check all transactions
SELECT 
    id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    payment_reference,
    created_at
FROM customer_wallet_transactions 
WHERE user_id = 'c49693ac-307a-492c-b6ed-55ada1fb1fde'
ORDER BY created_at DESC;

-- Step 3: Calculate what the balance should be
SELECT 
    'Calculated Balance' as info,
    COALESCE(
        SUM(CASE 
            WHEN transaction_type = 'credit' THEN amount 
            WHEN transaction_type = 'debit' THEN -amount
            WHEN transaction_type = 'refund' THEN amount
            ELSE 0 
        END), 0
    )::text as value
FROM customer_wallet_transactions
WHERE user_id = 'c49693ac-307a-492c-b6ed-55ada1fb1fde';

-- Step 4: Fix the wallet balance (run this if the calculated balance is different from current)
-- UPDATE customer_wallets
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
--     WHERE user_id = 'c49693ac-307a-492c-b6ed-55ada1fb1fde'
-- ),
-- updated_at = NOW()
-- WHERE user_id = 'c49693ac-307a-492c-b6ed-55ada1fb1fde';