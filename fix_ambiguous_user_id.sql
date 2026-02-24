-- Fix for ambiguous user_id column references
-- Run this in your Supabase SQL Editor to fix all ambiguous column references

-- Fix 1: Update vendor_payout_profiles RLS policies
DROP POLICY IF EXISTS "Vendors can view own payout profile" ON vendor_payout_profiles;
CREATE POLICY "Vendors can view own payout profile" ON vendor_payout_profiles
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()) 
         OR vendor_payout_profiles.user_id = auth.uid());

DROP POLICY IF EXISTS "Vendors can insert own payout profile" ON vendor_payout_profiles;
CREATE POLICY "Vendors can insert own payout profile" ON vendor_payout_profiles
  FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid())
         OR vendor_payout_profiles.user_id = auth.uid());

DROP POLICY IF EXISTS "Vendors can update own payout profile" ON vendor_payout_profiles;
CREATE POLICY "Vendors can update own payout profile" ON vendor_payout_profiles
  FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid())
         OR vendor_payout_profiles.user_id = auth.uid());

-- Fix 2: Update vendor_categories RLS policies
DROP POLICY IF EXISTS "Vendors can manage own categories" ON vendor_categories;
CREATE POLICY "Vendors can manage own categories" ON vendor_categories
  FOR ALL
  USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid()));

-- Fix 3: Update delivery_agent RLS policies
DROP POLICY IF EXISTS "Delivery agents can manage own profile" ON delivery_agents;
CREATE POLICY "Delivery agents can manage own profile" ON delivery_agents
  FOR ALL
  USING (delivery_agents.user_id = auth.uid());

-- Fix 4: Update agent_payout_profiles RLS policies
DROP POLICY IF EXISTS "Agents can manage own payout profile" ON agent_payout_profiles;
CREATE POLICY "Agents can manage own payout profile" ON agent_payout_profiles
  FOR ALL
  USING (agent_payout_profiles.user_id = auth.uid());

-- Fix 5: Update favorites RLS policies
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL
  USING (favorites.user_id = auth.uid());

-- Verify the fixes
SELECT 
    'RLS Policy Fixes Applied Successfully' as status,
    tablename,
    policyname
FROM pg_policies 
WHERE policyname IN (
    'Vendors can view own payout profile',
    'Vendors can insert own payout profile', 
    'Vendors can update own payout profile',
    'Vendors can manage own categories',
    'Delivery agents can manage own profile',
    'Agents can manage own payout profile',
    'Users can manage own favorites'
)
ORDER BY tablename, policyname;