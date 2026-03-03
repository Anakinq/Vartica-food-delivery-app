-- ============================================================================
-- PART 1: Column Additions, Tables, Views, and Helper Functions
-- ============================================================================
-- This file handles:
-- 1. agent_wallets missing columns (customer_funds, delivery_earnings)
-- 2. vendor_wallets missing financial columns
-- 3. withdrawals table creation
-- 4. admin_withdrawals_view creation
-- 5. Helper functions for ID lookups
-- ============================================================================
-- Run this FIRST in Supabase SQL Editor
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
-- Part 1 Complete - Continue with Part 2 for RLS policies
-- ============================================================================

COMMIT;

SELECT '=== PART 1 COMPLETED: Columns, Tables, Views, and Functions Created ===' as status;
