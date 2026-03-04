-- ============================================================================
-- COMPREHENSIVE FIX FOR ALL ISSUES
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- ISSUE 1: Customer Orders - Fix RLS Policies
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Customers can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;

-- Create proper RLS policy for customers to view their orders
CREATE POLICY "customers_view_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Also allow delivery agents to view orders assigned to them
CREATE POLICY "agents_view_assigned_orders" ON orders
  FOR SELECT USING (auth.uid() = delivery_agent_id);

-- Allow vendors to view orders for their shop
CREATE POLICY "vendors_view_shop_orders" ON orders
  FOR SELECT USING (auth.uid() = seller_id);

-- Grant SELECT permissions
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON orders TO anon;

-- ============================================================================
-- ISSUE 2: Admin - Fix admin_withdrawals_view with payout profile fields
-- ============================================================================

-- Step 1: Check if agent_payout_profiles table exists
SELECT 
    'agent_payout_profiles table exists: ' || 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_payout_profiles') as result;

-- Step 2: Recreate the view with proper payout profile join
DROP VIEW IF EXISTS admin_withdrawals_view;

CREATE VIEW admin_withdrawals_view AS
SELECT 
  w.id,
  w.agent_id,
  w.amount,
  w.status,
  w.type AS withdrawal_type,
  w.created_at,
  w.processed_at,
  w.admin_notes,
  w.error_message,
  -- Agent payout profile fields (bank details)
  ap.bank_name AS payout_bank_name,
  ap.account_number AS payout_account_number,
  ap.account_name AS payout_account_name,
  -- Agent info
  da.full_name AS agent_name,
  da.email AS agent_email
FROM withdrawals w
LEFT JOIN delivery_agents da ON w.agent_id = da.id
LEFT JOIN agent_payout_profiles ap ON da.id = ap.agent_id
ORDER BY w.created_at DESC;

-- Step 3: Grant permissions on the view
GRANT SELECT ON admin_withdrawals_view TO authenticated;
GRANT SELECT ON admin_withdrawals_view TO anon;
GRANT SELECT ON admin_withdrawals_view TO service_role;

-- ============================================================================
-- ISSUE 3: Banner Carousel - Fix RLS and ensure storage bucket
-- ============================================================================

-- Step 1: Fix RLS on banners table
-- Allow public read access to active banners
DROP POLICY IF EXISTS "anyone_can_read_active_banners" ON banners;
CREATE POLICY "anyone_can_read_active_banners" ON banners
  FOR SELECT USING (is_active = true);

-- Only admins can modify banners
DROP POLICY IF EXISTS "admins_can_manage_banners" ON banners;
CREATE POLICY "admins_can_manage_banners" ON banners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Grant permissions
GRANT SELECT ON banners TO authenticated;
GRANT SELECT ON banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON banners TO authenticated;

-- Step 2: Verify storage bucket (run this in Storage UI or manually check)
-- Go to Supabase Dashboard > Storage > Buckets
-- Ensure there's a 'banners' bucket with public read access

-- ============================================================================
-- ISSUE: Fix wallet columns for delivery agents
-- ============================================================================

-- Add missing columns to agent_wallets if they don't exist
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS food_wallet_balance DECIMAL(10,2) DEFAULT 0;

ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS earnings_wallet_balance DECIMAL(10,2) DEFAULT 0;

ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS pending_withdrawal DECIMAL(10,2) DEFAULT 0;

-- Ensure withdrawals table has the type column
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'earnings';

-- Update existing withdrawals that might have null type
UPDATE withdrawals 
SET type = 'earnings' 
WHERE type IS NULL OR type = '';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_agent_status 
ON withdrawals(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_withdrawals_type 
ON withdrawals(type);

-- Grant permissions
GRANT ALL ON agent_wallets TO authenticated;
GRANT ALL ON withdrawals TO authenticated;

-- ============================================================================
-- VERIFICATION: Check all fixes
-- ============================================================================

SELECT '=== VERIFICATION RESULTS ===' as status;

-- Check RLS on orders
SELECT 
    'orders table RLS enabled: ' || rowsecurity as result
FROM pg_tables 
WHERE tablename = 'orders';

-- Check admin_withdrawals_view columns
SELECT 
    'admin_withdrawals_view columns: ' || 
    string_agg(column_name, ', ') as result
FROM information_schema.columns 
WHERE table_name = 'admin_withdrawals_view';

-- Check banners RLS
SELECT 
    'banners table RLS enabled: ' || rowsecurity as result
FROM pg_tables 
WHERE tablename = 'banners';

-- Check agent_wallets columns
SELECT 
    'agent_wallets columns: ' || 
    string_agg(column_name, ', ') as result
FROM information_schema.columns 
WHERE table_name = 'agent_wallets';

SELECT '=== FIXES COMPLETED ===' as status;
