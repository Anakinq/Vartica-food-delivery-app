-- ============================================================================
-- PART 3: Permissions and Verification
-- ============================================================================
-- This file:
-- 1. Grants necessary permissions on tables
-- 2. Grants execute permissions on functions
-- 3. Verifies all the fixes were applied correctly
-- ============================================================================
-- Run this THIRD in Supabase SQL Editor (after Part 1 and Part 2)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Grant Permissions on Tables
-- ============================================================================

-- Grant permissions on withdrawals table
GRANT ALL ON withdrawals TO authenticated;
GRANT ALL ON withdrawals TO service_role;
GRANT ALL ON withdrawals TO anon;

-- Grant permissions on agent_wallets table
GRANT ALL ON agent_wallets TO authenticated;
GRANT ALL ON agent_wallets TO service_role;
GRANT ALL ON agent_wallets TO anon;

-- Grant permissions on vendor_wallets table
GRANT ALL ON vendor_wallets TO authenticated;
GRANT ALL ON vendor_wallets TO service_role;
GRANT ALL ON vendor_wallets TO anon;

-- ============================================================================
-- SECTION 2: Grant Permissions on Views
-- ============================================================================

-- Grant SELECT on admin_withdrawals_view
GRANT SELECT ON admin_withdrawals_view TO authenticated;
GRANT SELECT ON admin_withdrawals_view TO anon;
GRANT SELECT ON admin_withdrawals_view TO service_role;

-- ============================================================================
-- SECTION 3: Grant Execute Permissions on Functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_agent_id_from_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendor_id_from_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_from_agent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_from_vendor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_wallet_by_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendor_wallet_by_user(UUID) TO authenticated;

-- Also grant to anon and service_role for complete access
GRANT EXECUTE ON FUNCTION get_agent_id_from_user(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_vendor_id_from_user(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_id_from_agent(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_user_id_from_vendor(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_agent_wallet_by_user(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_vendor_wallet_by_user(UUID) TO anon;

GRANT EXECUTE ON FUNCTION get_agent_id_from_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_vendor_id_from_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_id_from_agent(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_id_from_vendor(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_agent_wallet_by_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_vendor_wallet_by_user(UUID) TO service_role;

-- ============================================================================
-- Part 3 Complete - Verification
-- ============================================================================

COMMIT;

-- ============================================================================
-- SECTION 4: Verification Queries
-- ============================================================================

SELECT '=== VERIFICATION RESULTS ===' as status;

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

-- Check RLS is enabled
SELECT 'RLS enabled on withdrawals:' as info,
       EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'withdrawals' AND rowsecurity = true) as rls_enabled;

SELECT 'RLS enabled on agent_wallets:' as info,
       EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'agent_wallets' AND rowsecurity = true) as rls_enabled;

SELECT 'RLS enabled on vendor_wallets:' as info,
       EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'vendor_wallets' AND rowsecurity = true) as rls_enabled;

-- Check RLS policies
SELECT 'withdrawals RLS policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'withdrawals';

SELECT 'agent_wallets RLS policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'agent_wallets';

SELECT 'vendor_wallets RLS policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'vendor_wallets';

-- Check functions exist
SELECT 'Functions created:' as info;
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN (
    'get_agent_id_from_user',
    'get_vendor_id_from_user', 
    'get_user_id_from_agent',
    'get_user_id_from_vendor',
    'get_agent_wallet_by_user',
    'get_vendor_wallet_by_user'
);

-- Check permissions granted
SELECT 'Permissions on withdrawals:' as info;
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'withdrawals';

SELECT 'Permissions on admin_withdrawals_view:' as info;
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'admin_withdrawals_view';

SELECT '=== ALL FIXES COMPLETED SUCCESSFULLY ===' as status;
SELECT 'You can now run your application with the database fixes applied.' as note;
