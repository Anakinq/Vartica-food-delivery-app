-- Check your wallet balance and transactions
-- Run this in your Supabase SQL Editor

-- First, find your user ID by looking up your email (replace 'your-email@example.com' with your actual email)
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Once you have your user_id, use it in this query to check your wallet:
-- Replace 'YOUR_USER_ID_HERE' with the ID from the query above

-- Check your wallet balance
SELECT * FROM customer_wallets WHERE user_id = 'YOUR_USER_ID_HERE';

-- Check your transaction history
SELECT 
    id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    payment_reference,
    description,
    created_at
FROM customer_wallet_transactions 
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC;

-- If you can see the transaction but the balance is wrong, run this to fix:
-- UPDATE customer_wallets 
-- SET balance = (SELECT COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) 
--                 FROM customer_wallet_transactions WHERE user_id = 'YOUR_USER_ID_HERE'),
--     updated_at = NOW()
-- WHERE user_id = 'YOUR_USER_ID_HERE';