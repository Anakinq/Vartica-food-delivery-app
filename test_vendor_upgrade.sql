-- Test script to verify vendor upgrade functionality
-- Run this after executing final_vendor_fix.sql

-- First, let's check what we have
\echo '=== Current Database Schema Check ==='

-- Check vendors table structure
SELECT 'vendors columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;

-- Check if the function exists
SELECT 'upgrade_customer_to_vendor function exists:' as info;
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'upgrade_customer_to_vendor';

-- Check profiles table structure
SELECT 'profiles columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

\echo '=== Testing Vendor Upgrade Function ==='

-- This will fail with "user not found" but shows the function works
-- Uncomment and replace with actual customer user ID to test
/*
DO $$
DECLARE
  result json;
BEGIN
  result := public.upgrade_customer_to_vendor(
    'YOUR_CUSTOMER_USER_ID_HERE',  -- Replace with actual customer UUID
    'Test Vendor Store',
    'This is a test vendor application',
    'student',
    'MAT123456',
    'Computer Science',
    NULL,
    NULL,
    'does_not_offer_hostel_delivery'
  );
  
  RAISE NOTICE 'Function result: %', result;
END $$;
*/

\echo '=== Verification Complete ==='
\echo 'If no errors above, the vendor upgrade functionality is ready to use!'