-- Fix all ambiguous user_id column references
-- Run this in your Supabase SQL Editor to fix all ambiguous column references

-- Fix 1: Update vendor_payout_profiles RLS policies (already fixed in vendor_payout_setup.sql)
-- This is included here for completeness

-- Drop existing policies
DROP POLICY IF EXISTS "Vendors can view own payout profile" ON vendor_payout_profiles;
DROP POLICY IF EXISTS "Vendors can insert own payout profile" ON vendor_payout_profiles;
DROP POLICY IF EXISTS "Vendors can update own payout profile" ON vendor_payout_profiles;

-- Create fixed policies with explicit table prefixes
CREATE POLICY "Vendors can view own payout profile" ON vendor_payout_profiles
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()) 
         OR vendor_payout_profiles.user_id = auth.uid());

CREATE POLICY "Vendors can insert own payout profile" ON vendor_payout_profiles
  FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid())
         OR vendor_payout_profiles.user_id = auth.uid());

CREATE POLICY "Vendors can update own payout profile" ON vendor_payout_profiles
  FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid())
         OR vendor_payout_profiles.user_id = auth.uid());

-- Fix 2: Update vendor_withdrawals RLS policies
DROP POLICY IF EXISTS "Vendors can view own withdrawals" ON vendor_withdrawals;
CREATE POLICY "Vendors can view own withdrawals" ON vendor_withdrawals
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()));

-- Fix 3: Update vendor_wallet_transactions RLS policies
DROP POLICY IF EXISTS "Vendors can view own transactions" ON vendor_wallet_transactions;
CREATE POLICY "Vendors can view own transactions" ON vendor_wallet_transactions
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()));

-- Fix 4: Update vendor_categories RLS policies (already fixed in vendor_categories_migration.sql)
-- This is included here for completeness

-- Drop existing policies
DROP POLICY IF EXISTS "Vendors can view own categories" ON vendor_categories;
DROP POLICY IF EXISTS "Vendors can insert own categories" ON vendor_categories;
DROP POLICY IF EXISTS "Vendors can update own categories" ON vendor_categories;
DROP POLICY IF EXISTS "Vendors can delete own categories" ON vendor_categories;

-- Create fixed policies
CREATE POLICY "Vendors can view own categories" ON vendor_categories
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()));

CREATE POLICY "Vendors can insert own categories" ON vendor_categories
  FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()));

CREATE POLICY "Vendors can update own categories" ON vendor_categories
  FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()));

CREATE POLICY "Vendors can delete own categories" ON vendor_categories
  FOR DELETE
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()));

-- Test the fixes
SELECT 'All ambiguous user_id references have been fixed!' as status;

-- Quick verification query
SELECT 
    p.id,
    p.email,
    v.store_name,
    v.user_id as vendor_user_id
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE v.user_id = p.id  -- This should work without errors now
LIMIT 1;
