-- Debug script to check the current database schema and relationships
-- Run this in your Supabase SQL Editor to diagnose the profile fetching issue

-- 1. Check profiles table structure
SELECT 
    'Profiles table structure:' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check vendors table structure
SELECT 
    'Vendors table structure:' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;

-- 3. Check if the foreign key relationship exists
SELECT
    'Foreign key relationships:' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (tc.table_name = 'vendors' OR tc.table_name = 'profiles');

-- 4. Check RLS policies on profiles table
SELECT 
    'Profiles RLS policies:' as info,
    polname as policy_name,
    polcmd as command,
    polqual as condition,
    polwithcheck as with_check
FROM pg_policy 
WHERE polrelid = 'profiles'::regclass;

-- 5. Check RLS policies on vendors table
SELECT 
    'Vendors RLS policies:' as info,
    polname as policy_name,
    polcmd as command,
    polqual as condition,
    polwithcheck as with_check
FROM pg_policy 
WHERE polrelid = 'vendors'::regclass;

-- 6. Test the problematic query structure
-- Test if we can query profiles with basic select
SELECT 'Basic profiles query test successful' as result;
SELECT id, email, full_name, role FROM profiles LIMIT 1;

-- Test if we can query vendors with basic select
SELECT 'Basic vendors query test successful' as result;
SELECT id, user_id, store_name FROM vendors LIMIT 1;

-- Test the join that's failing
SELECT 'Join query test:' as info;
SELECT 
    p.id,
    p.email,
    p.full_name,
    v.store_name,
    v.application_status
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE p.id = '8e08263d-b06d-4eb8-9d71-abaefe8faf1d'
LIMIT 1;

-- 7. Check if the specific user exists
SELECT 
    'User existence check for ID: 8e08263d-b06d-4eb8-9d71-abaefe8faf1d' as info;
SELECT 
    id, 
    email, 
    full_name, 
    role,
    vendor_approved
FROM profiles 
WHERE id = '8e08263d-b06d-4eb8-9d71-abaefe8faf1d';

-- 8. Check if there's a vendor record for this user
SELECT 
    'Vendor record check for user ID: 8e08263d-b06d-4eb8-9d71-abaefe8faf1d' as info;
SELECT 
    id,
    user_id,
    store_name,
    application_status,
    is_active
FROM vendors 
WHERE vendors.user_id = '8e08263d-b06d-4eb8-9d71-abaefe8faf1d';

SELECT 'Debug script completed' as status;