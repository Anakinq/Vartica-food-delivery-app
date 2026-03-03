-- ============================================================================
-- COMPREHENSIVE SQL FIX: Backend/Frontend Conflicts
-- ============================================================================
-- This file fixes all identified backend/frontend conflicts including:
-- 1. agent_wallets missing columns (customer_funds, delivery_earnings)
-- 2. admin_withdrawals_view creation/fix
-- 3. vendor_wallets missing financial columns
-- 4. Helper functions for ID lookups
-- 5. Consolidated RLS policies for withdrawal tables
-- 6. Withdrawal type enum standardization
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Fix agent_wallets - Add missing financial columns
-- ============================================================================

-- Add customer_funds column if it doesn't exist (funds from food wallet)
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS customer_funds DECIMAL(10,2) DEFAULT 0 
CHECK (customer_funds >= 0);

-- Add delivery_earnings column if it doesn't exist (earnings from deliveries)
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS delivery_earnings DECIMAL(10,2) DEFAULT 0 
CHECK (delivery_earnings >= 0);

-- Ensure existing columns exist
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS food_wallet_balance DECIMAL(10,2) DEFAULT 0 
CHECK (food_wallet_balance >= 0);

ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS earnings_wallet_balance DECIMAL(10,2) DEFAULT 0 
CHECK (earnings_wallet_balance >= 0);

ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS pending_withdrawal DECIMAL(10,2) DEFAULT 0 
CHECK (pending_withdrawal >= 0);

ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS total_withdrawals DECIMAL(10,2) DEFAULT 0 
CHECK (total_withdrawals >= 0);

-- Add updated_at column if missing
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index on agent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent_id ON agent_wallets(agent_id);

-- ============================================================================
-- SECTION 2: Fix vendor_wallets - Add missing financial columns
-- ============================================================================

-- Add missing financial columns to vendor_wallets
ALTER TABLE vendor_wallets 
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0 
CHECK (pending_earnings >= 0);

ALTER TABLE vendor_wallets 
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0 
CHECK (total_earnings >= 0);

ALTER TABLE vendor_wallets 
ADD COLUMN IF NOT EXISTS withdrawn_earnings DECIMAL(10,2) DEFAULT 0 
CHECK (withdrawn_earnings >= 0);

ALTER TABLE vendor_wallets 
ADD COLUMN IF NOT EXISTS pending_withdrawal DECIMAL(10,2) DEFAULT 0 
CHECK (pending_withdrawal >= 0);

ALTER TABLE vendor_wallets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index on vendor_id
CREATE INDEX IF NOT EXISTS idx_vendor_wallets_vendor_id ON vendor_wallets(vendor_id);

-- ============================================================================
-- SECTION 3: Create/Replace withdrawals table (main withdrawals table)
-- ============================================================================

-- Drop existing tables/views if they conflict
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS agent_withdrawals CASCADE;

-- Create unified withdrawals table for agents
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES delivery_agents(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'pending_approval', 'processing', 'completed', 'failed', 'rejected')),
    withdrawal_type VARCHAR(50) NOT NULL DEFAULT 'earnings'
        CHECK (withdrawal_type IN ('earnings', 'food', 'customer_funds', 'delivery_earnings')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    paystack_transfer_code VARCHAR(255),
    paystack_transfer_reference VARCHAR(255),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    admin_notes TEXT,
    sent_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES profiles(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_agent_id ON withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- Enable RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawals
DROP POLICY IF EXISTS "Agents can view own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Agents can insert own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Service role can manage all withdrawals" ON withdrawals;

-- Agents can view their own withdrawals
CREATE POLICY "Agents can view own withdrawals" ON withdrawals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM delivery_agents
            WHERE delivery_agents.id = withdrawals.agent_id
            AND delivery_agents.user_id = auth.uid()
        )
    );

-- Agents can insert their own withdrawals
CREATE POLICY "Agents can insert own withdrawals" ON withdrawals
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM delivery_agents
            WHERE delivery_agents.id = withdrawals.agent_id
            AND delivery_agents.user_id = auth.uid()
        )
    );

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals" ON withdrawals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Service role can manage all
CREATE POLICY "Service role can manage all withdrawals" ON withdrawals
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- SECTION 4: Create admin_withdrawals_view (unified view for admin dashboard)
-- ============================================================================

DROP VIEW IF EXISTS admin_withdrawals_view;

CREATE VIEW admin_withdrawals_view AS
SELECT 
    w.id,
    w.agent_id,
    w.amount,
    w.status,
    w.withdrawal_type,
    w.created_at,
    w.updated_at,
    w.processed_at,
    w.error_message,
    w.paystack_transfer_code,
    w.paystack_transfer_reference,
    w.admin_notes,
    w.approved_by,
    w.approved_at,
    w.sent_at,
    w.rejected_by,
    w.rejected_at,
    w.rejection_reason,
    -- Agent profile info
    p.full_name as agent_name,
    p.email as agent_email,
    p.phone as agent_phone,
    -- Bank/payout details
    app.account_name as payout_account_name,
    app.account_number as payout_account_number,
    app.bank_code as payout_bank_code,
    CASE 
        WHEN app.bank_code = '044' THEN 'Access Bank'
        WHEN app.bank_code = '063' THEN 'Access Bank (Diamond)'
        WHEN app.bank_code = '035A' THEN 'ALAT by WEMA'
        WHEN app.bank_code = '401' THEN 'ASO Savings and Loans'
        WHEN app.bank_code = '023' THEN 'Citibank Nigeria'
        WHEN app.bank_code = '050' THEN 'Ecobank Nigeria'
        WHEN app.bank_code = '562' THEN 'Ekondo Microfinance Bank'
        WHEN app.bank_code = '070' THEN 'Fidelity Bank'
        WHEN app.bank_code = '011' THEN 'First Bank of Nigeria'
        WHEN app.bank_code = '214' THEN 'First City Monument Bank'
        WHEN app.bank_code = '901' THEN 'FSDH Merchant Bank Limited'
        WHEN app.bank_code = '00103' THEN 'Globus Bank'
        WHEN app.bank_code = '100022' THEN 'GoMoney'
        WHEN app.bank_code = '058' THEN 'Guaranty Trust Bank'
        WHEN app.bank_code = '030' THEN 'Heritage Bank'
        WHEN app.bank_code = '301' THEN 'Jaiz Bank'
        WHEN app.bank_code = '082' THEN 'Keystone Bank'
        WHEN app.bank_code = '559' THEN 'Kuda Bank'
        WHEN app.bank_code = '50211' THEN 'Kuda Microfinance Bank'
        WHEN app.bank_code = '999992' THEN 'OPay'
        WHEN app.bank_code = '526' THEN 'Parallex Bank'
        WHEN app.bank_code = '999991' THEN 'PalmPay'
        WHEN app.bank_code = '076' THEN 'Polaris Bank'
        WHEN app.bank_code = '101' THEN 'Providus Bank'
        WHEN app.bank_code = '125' THEN 'Rubies MFB'
        WHEN app.bank_code = '51310' THEN 'Sparkle Microfinance Bank'
        WHEN app.bank_code = '221' THEN 'Stanbic IBTC Bank'
        WHEN app.bank_code = '068' THEN 'Standard Chartered Bank'
        WHEN app.bank_code = '232' THEN 'Sterling Bank'
        WHEN app.bank_code = '100' THEN 'Suntrust Bank'
        WHEN app.bank_code = '302' THEN 'TAJ Bank'
        WHEN app.bank_code = '102' THEN 'Titan Bank'
        WHEN app.bank_code = '032' THEN 'Union Bank of Nigeria'
        WHEN app.bank_code = '033' THEN 'United Bank For Africa'
        WHEN app.bank_code = '215' THEN 'Unity Bank'
        WHEN app.bank_code = '566' THEN 'VFD Microfinance Bank'
        WHEN app.bank_code = '035' THEN 'Wema Bank'
        WHEN app.bank_code = '057' THEN 'Zenith Bank'
        ELSE COALESCE(app.bank_code, 'Unknown Bank')
    END as payout_bank_name
FROM withdrawals w
LEFT JOIN delivery_agents da ON w.agent_id = da.id
LEFT JOIN profiles p ON da.user_id = p.id
LEFT JOIN agent_payout_profiles app ON da.user_id = app.user_id
ORDER BY w.created_at DESC;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON admin_withdrawals_view TO authenticated;
GRANT SELECT ON admin_withdrawals_view TO anon;

-- ============================================================================
-- SECTION 5: Create Helper Functions for ID Lookups
-- ============================================================================

-- Function to get agent_id from user_id
CREATE OR REPLACE FUNCTION get_agent_id_from_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_agent_id UUID;
BEGIN
    SELECT id INTO v_agent_id
    FROM delivery_agents
    WHERE user_id = p_user_id
    LIMIT 1;
    RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vendor_id from user_id
CREATE OR REPLACE FUNCTION get_vendor_id_from_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_vendor_id UUID;
BEGIN
    SELECT id INTO v_vendor_id
    FROM vendors
    WHERE user_id = p_user_id
    LIMIT 1;
    RETURN v_vendor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user_id from agent_id
CREATE OR REPLACE FUNCTION get_user_id_from_agent(p_agent_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM delivery_agents
    WHERE id = p_agent_id
    LIMIT 1;
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user_id from vendor_id
CREATE OR REPLACE FUNCTION get_user_id_from_vendor(p_vendor_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM vendors
    WHERE id = p_vendor_id
    LIMIT 1;
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get agent wallet by user_id
CREATE OR REPLACE FUNCTION get_agent_wallet_by_user(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    agent_id UUID,
    food_wallet_balance DECIMAL(10,2),
    earnings_wallet_balance DECIMAL(10,2),
    customer_funds DECIMAL(10,2),
    delivery_earnings DECIMAL(10,2),
    pending_withdrawal DECIMAL(10,2),
    total_withdrawals DECIMAL(10,2),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aw.id,
        aw.agent_id,
        aw.food_wallet_balance,
        aw.earnings_wallet_balance,
        aw.customer_funds,
        aw.delivery_earnings,
        aw.pending_withdrawal,
        aw.total_withdrawals,
        aw.created_at,
        aw.updated_at
    FROM agent_wallets aw
    INNER JOIN delivery_agents da ON aw.agent_id = da.id
    WHERE da.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get vendor wallet by user_id
CREATE OR REPLACE FUNCTION get_vendor_wallet_by_user(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    vendor_id UUID,
    total_earnings DECIMAL(10,2),
    pending_earnings DECIMAL(10,2),
    withdrawn_earnings DECIMAL(10,2),
    pending_withdrawal DECIMAL(10,2),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vw.id,
        vw.vendor_id,
        vw.total_earnings,
        vw.pending_earnings,
        vw.withdrawn_earnings,
        vw.pending_withdrawal,
        vw.created_at,
        vw.updated_at
    FROM vendor_wallets vw
    INNER JOIN vendors v ON vw.vendor_id = v.id
    WHERE v.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 6: Create/update RLS Policies for Consistency
-- ============================================================================

-- Ensure agent_wallets has proper RLS policies
ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can create own agent wallet" ON agent_wallets;
DROP POLICY IF EXISTS "Users can view own agent wallet" ON agent_wallets;
DROP POLICY IF EXISTS "Agents can view their own wallet" ON agent_wallets;
DROP POLICY IF EXISTS "Agents can update their own wallet" ON agent_wallets;
DROP POLICY IF EXISTS "Admins can view all agent wallets" ON agent_wallets;

-- Agents can view their own wallet
CREATE POLICY "Agents can view own wallet" ON agent_wallets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM delivery_agents
            WHERE delivery_agents.id = agent_wallets.agent_id
            AND delivery_agents.user_id = auth.uid()
        )
    );

-- Agents can update their own wallet (for balance updates)
CREATE POLICY "Agents can update own wallet" ON agent_wallets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM delivery_agents
            WHERE delivery_agents.id = agent_wallets.agent_id
            AND delivery_agents.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM delivery_agents
            WHERE delivery_agents.id = agent_wallets.agent_id
            AND delivery_agents.user_id = auth.uid()
        )
    );

-- Service role can manage all wallets
CREATE POLICY "Service role can manage agent wallets" ON agent_wallets
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Ensure vendor_wallets has proper RLS policies
ALTER TABLE vendor_wallets ENABLE ROW LEVEL SECURITY;

-- Drop conflicting policies
DROP POLICY IF EXISTS "Vendors can view their own wallet" ON vendor_wallets;
DROP POLICY IF EXISTS "Vendors can update their own wallet" ON vendor_wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON vendor_wallets;

-- Vendors can view their own wallet
CREATE POLICY "Vendors can view own wallet" ON vendor_wallets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = vendor_wallets.vendor_id
            AND vendors.user_id = auth.uid()
        )
    );

-- Vendors can update their own wallet
CREATE POLICY "Vendors can update own wallet" ON vendor_wallets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = vendor_wallets.vendor_id
            AND vendors.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM vendors
            WHERE vendors.id = vendor_wallets.vendor_id
            AND vendors.user_id = auth.uid()
        )
    );

-- Service role can manage all vendor wallets
CREATE POLICY "Service role can manage vendor wallets" ON vendor_wallets
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- SECTION 7: Grant Necessary Permissions
-- ============================================================================

GRANT ALL ON withdrawals TO authenticated;
GRANT ALL ON withdrawals TO service_role;
GRANT ALL ON withdrawals TO anon;

GRANT ALL ON agent_wallets TO authenticated;
GRANT ALL ON agent_wallets TO service_role;
GRANT ALL ON agent_wallets TO anon;

GRANT ALL ON vendor_wallets TO authenticated;
GRANT ALL ON vendor_wallets TO service_role;
GRANT ALL ON vendor_wallets TO anon;

GRANT EXECUTE ON FUNCTION get_agent_id_from_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendor_id_from_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_from_agent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_from_vendor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_wallet_by_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendor_wallet_by_user(UUID) TO authenticated;

-- ============================================================================
-- SECTION 8: Verify the Fix
-- ============================================================================

SELECT '=== VERIFICATION ===' as status;

-- Check agent_wallets columns
SELECT 'agent_wallets columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_wallets' 
ORDER BY ordinal_position;

-- Check vendor_wallets columns
SELECT 'vendor_wallets columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendor_wallets' 
ORDER BY ordinal_position;

-- Check withdrawals table exists
SELECT 'withdrawals table exists:' as info, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals') as exists;

-- Check admin_withdrawals_view exists
SELECT 'admin_withdrawals_view exists:' as info,
       EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'admin_withdrawals_view') as exists;

-- Check RLS policies
SELECT 'withdrawals RLS policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'withdrawals';

SELECT '=== FIX COMPLETED SUCCESSFULLY ===' as status;

COMMIT;
