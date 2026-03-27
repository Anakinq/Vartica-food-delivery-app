-- ============================================================
-- CUSTOMER WALLET SYSTEM - DATABASE SCHEMA
-- ============================================================
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
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_wallets' AND policyname = 'Users can view own wallet') THEN
        CREATE POLICY "Users can view own wallet"
            ON customer_wallets FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_wallets' AND policyname = 'Service role can manage customer wallets') THEN
        CREATE POLICY "Service role can manage customer wallets"
            ON customer_wallets FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_customer_wallets_user_id ON customer_wallets(user_id);

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
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_wallet_transactions' AND policyname = 'Users can view own transactions') THEN
        CREATE POLICY "Users can view own transactions"
            ON customer_wallet_transactions FOR SELECT
            TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_wallet_transactions' AND policyname = 'Service role can manage transactions') THEN
        CREATE POLICY "Service role can manage transactions"
            ON customer_wallet_transactions FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_wallet_transactions_user_id ON customer_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_wallet_transactions_order_id ON customer_wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_wallet_transactions_created_at ON customer_wallet_transactions(created_at DESC);

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
CREATE OR REPLACE FUNCTION create_customer_wallet_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customer_wallets (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_create_customer_wallet ON profiles;
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
-- Verification
-- ============================================================
SELECT 'customer_wallets columns:' as info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_wallets'
ORDER BY ordinal_position;

SELECT 'customer_wallet_transactions columns:' as info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'customer_wallet_transactions'
ORDER BY ordinal_position;

SELECT 'orders new columns:' as info, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('refunded_at', 'delivery_pin', 'payment_reference')
ORDER BY ordinal_position;

SELECT 'Sample wallet data:' as info, * FROM customer_wallets LIMIT 5;