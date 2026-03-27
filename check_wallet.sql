-- Quick wallet fix script
-- Run these queries in your Supabase SQL Editor

-- Step 1: Find your user (replace with your email)
-- SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';

-- Step 2: After getting your user_id, check your current wallet and transactions
-- Replace 'YOUR_USER_ID' with your actual user ID from Step 1

SELECT 
    'Wallet Balance' as info,
    COALESCE(balance::text, 'No wallet found') as value
FROM customer_wallets 
WHERE user_id = 'YOUR_USER_ID';

SELECT 
    'Total Transactions' as info,
    COUNT(*)::text as value
FROM customer_wallet_transactions 
WHERE user_id = 'YOUR_USER_ID';

-- Step 3: Show all transactions (this will tell us if the top-up was recorded)
SELECT 
    created_at,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    payment_reference
FROM customer_wallet_transactions 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- Step 4: If transactions exist but balance is wrong, run this to fix:
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
--     WHERE user_id = 'YOUR_USER_ID'
-- ),
-- updated_at = NOW()
-- WHERE user_id = 'YOUR_USER_ID';