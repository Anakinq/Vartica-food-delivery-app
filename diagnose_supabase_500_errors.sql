-- =====================================================
-- Supabase 500 Error Diagnostic SQL Queries
-- Run these in your Supabase SQL Editor to diagnose database issues
-- =====================================================

-- =====================================================
-- 1. Check if all required tables exist
-- =====================================================
SELECT 
    'Checking required tables...' as diagnostic_step,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 2. Check for broken or missing RLS policies
-- =====================================================
SELECT 
    'Checking RLS policies...' as diagnostic_step,
    tablename as table_name,
    policyname,
    permissive,
    cmd,
    qual::text as filter_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 3. Check for RLS policy errors on key tables
-- =====================================================
SELECT 
    'Verifying RLS is enabled on key tables...' as diagnostic_step,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'banners', 'cafeterias', 'vendors', 'orders', 'order_items');

-- =====================================================
-- 4. Check for invalid foreign key constraints
-- =====================================================
SELECT 
    'Checking foreign key constraints...' as diagnostic_step,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public';

-- =====================================================
-- 5. Check for missing or invalid indexes
-- =====================================================
SELECT 
    'Checking indexes on key tables...' as diagnostic_step,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'banners', 'cafeterias', 'vendors', 'orders', 'order_items')
ORDER BY tablename, indexname;

-- =====================================================
-- 6. Check for function errors (especially for profiles trigger)
-- =====================================================
SELECT 
    'Checking database functions...' as diagnostic_step,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- =====================================================
-- 7. Test basic queries on each table to isolate the issue
-- =====================================================
-- Uncomment each to test:

-- Test profiles table
-- SELECT * FROM profiles LIMIT 1;

-- Test banners table  
-- SELECT * FROM banners LIMIT 1;

-- Test cafeterias table
-- SELECT * FROM cafeterias LIMIT 1;

-- Test vendors table
-- SELECT * FROM vendors LIMIT 1;

-- =====================================================
-- 8. Check for recent database errors in logs
-- =====================================================
-- Note: This requires Supabase Pro/Team plan for log access
-- Run this in Supabase Dashboard > Logs Explorer instead

-- =====================================================
-- 9. Quick fix: Disable and re-enable RLS if policies are broken
-- =====================================================

-- Example: Fix profiles table RLS
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add back basic RLS policies if missing
-- CREATE POLICY "Public profiles are viewable by everyone"
-- ON public.profiles FOR SELECT USING (true);

-- CREATE POLICY "Users can insert their own profile"
-- ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CREATE POLICY "Users can update own profile"
-- ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 10. Fix common issues with orphaned records
-- =====================================================

-- Check for profiles without matching auth.users
-- SELECT id, email FROM profiles 
-- WHERE id NOT IN (SELECT id FROM auth.users);

-- Check for vendors without valid owner references
-- SELECT v.id, v.store_name, v.owner_id 
-- FROM vendors v
-- WHERE v.owner_id IS NOT NULL 
-- AND v.owner_id NOT IN (SELECT id FROM profiles);

-- =====================================================
-- DIAGNOSTIC RESULTS INTERPRETATION:
-- =====================================================
-- If Step 1 returns empty for profiles/banners/cafeterias/vendors:
--   → Tables are missing, need to run migrations
--   
-- If Step 2 shows errors or no policies:
--   → RLS policies are missing or broken
--   
-- If Step 3 shows rowsecurity = false:
--   → RLS is disabled, enable it
--   
-- If Step 4 shows foreign key errors:
--   → Constraints are broken, need to fix
--   
-- If individual table queries in Step 7 fail:
--   → Table has corruption or missing columns
-- =====================================================
