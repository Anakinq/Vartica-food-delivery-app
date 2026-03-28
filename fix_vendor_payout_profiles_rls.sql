-- Fix vendor_payout_profiles RLS policies to allow proper access
-- This fixes 406 Not Acceptable errors when querying the table

-- First, check if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vendor_payout_profiles') THEN
        -- Drop existing policies that might be problematic
        DROP POLICY IF EXISTS "Vendors can view own payout profile" ON vendor_payout_profiles;
        DROP POLICY IF EXISTS "Vendors can insert own payout profile" ON vendor_payout_profiles;
        DROP POLICY IF EXISTS "Vendors can update own payout profile" ON vendor_payout_profiles;
        DROP POLICY IF EXISTS "Vendors can manage their own payout profile" ON vendor_payout_profiles;
        DROP POLICY IF EXISTS "Allow authenticated users full access to vendor_payout_profiles" ON vendor_payout_profiles;
        
        -- Create permissive policy for authenticated users
        CREATE POLICY "Authenticated users can access vendor_payout_profiles"
        ON vendor_payout_profiles
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
        -- Also allow anon for read access (if needed)
        CREATE POLICY "Anon can read vendor_payout_profiles"
        ON vendor_payout_profiles
        FOR SELECT
        TO anon
        USING (true);
        
        RAISE NOTICE 'vendor_payout_profiles policies fixed';
    ELSE
        RAISE WARNING 'vendor_payout_profiles table does not exist';
    END IF;
END $$;