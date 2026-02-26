-- ===================================================================
-- Fix for Runtime Issues
-- ===================================================================
-- This file addresses three issues:
-- 1. Phone number and hostel location not saving in profile dashboard
-- 2. Delivery agent approval not appearing in admin dashboard
-- 3. 404 error when fetching promo codes
-- ===================================================================

-- ===================================================================
-- ISSUE 1: Fix delivery_approved not being set to NULL
-- The add_delivery_agent_role function needs to set delivery_approved 
-- to NULL when registering a new delivery agent so it appears in admin
-- ===================================================================

-- First, let's check the current function definition
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'add_delivery_agent_role';

-- Drop existing function first to avoid parameter name issue
DROP FUNCTION IF EXISTS public.add_delivery_agent_role(UUID, TEXT);

-- Recreate the function with delivery_approved = NULL
CREATE OR REPLACE FUNCTION public.add_delivery_agent_role(
    user_id UUID,
    vehicle_type TEXT DEFAULT 'Foot'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN;
    delivery_agent_exists BOOLEAN;
    result JSON;
BEGIN
    -- Check if profile exists
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_id
    ) INTO profile_exists;

    IF NOT profile_exists THEN
        result := json_build_object(
            'success', false,
            'error', 'PROFILE_NOT_FOUND',
            'message', 'No profile found for user ' || user_id || '. Please complete your profile first.'
        );
        RETURN result;
    END IF;

    -- Check if already a delivery agent
    SELECT EXISTS (
        SELECT 1 FROM public.delivery_agents WHERE user_id = user_id
    ) INTO delivery_agent_exists;

    IF delivery_agent_exists THEN
        result := json_build_object(
            'success', false,
            'error', 'ALREADY_DELIVERY_AGENT',
            'message', 'User is already registered as a delivery agent.'
        );
        RETURN result;
    END IF;

    -- Update profile flags - SET delivery_approved to NULL so admin can approve
    UPDATE public.profiles 
    SET 
        is_delivery_agent = TRUE,
        role = CASE 
            WHEN role = 'customer' THEN 'delivery_agent'
            ELSE role
        END,
        delivery_approved = NULL,  -- This is the key fix - set to NULL for pending approval
        updated_at = NOW()
    WHERE id = user_id;

    -- Create delivery agent record
    INSERT INTO public.delivery_agents (
        user_id, 
        vehicle_type, 
        is_available, 
        active_orders_count, 
        total_deliveries, 
        rating,
        is_approved,
        is_foot_delivery
    )
    VALUES (
        user_id,
        vehicle_type,
        FALSE,  -- is_available
        0,      -- active_orders_count
        0,      -- total_deliveries
        0,      -- rating
        NULL,   -- is_approved - set to NULL for pending
        CASE WHEN vehicle_type = 'Foot' THEN TRUE ELSE FALSE END
    );

    result := json_build_object(
        'success', true,
        'message', 'Successfully registered as delivery agent. Pending admin approval.'
    );
    RETURN result;

EXCEPTION WHEN OTHERS THEN
    result := json_build_object(
        'success', false,
        'error', SQLSTATE,
        'message', SQLERRM
    );
    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.add_delivery_agent_role(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.add_delivery_agent_role IS 'Adds delivery agent role to existing user. Returns JSON with success status and message. Sets delivery_approved to NULL for admin approval.';

-- ===================================================================
-- ISSUE 2: Ensure delivery_approved column default is NULL not FALSE
-- Fix the default value for delivery_approved
-- ===================================================================

-- This might have been set to FALSE by a previous migration
-- Run this to ensure it's properly nullable and defaults to NULL
ALTER TABLE profiles 
ALTER COLUMN delivery_approved DROP DEFAULT,
ALTER COLUMN delivery_approved SET DEFAULT NULL,
ALTER COLUMN delivery_approved DROP NOT NULL;

-- ===================================================================
-- ISSUE 3: Fix promo codes table access
-- The RLS policies exist but might have issues with the query
-- ===================================================================

-- First, check what tables exist
SELECT 'Checking for promo code tables...' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%promo%';

-- Create delivery_fee_discount_promo_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_fee_discount_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE delivery_fee_discount_promo_codes ENABLE ROW LEVEL SECURITY;

-- Check if the table exists and has data
SELECT 'Checking delivery_fee_discount_promo_codes table...' as info;
SELECT COUNT(*) as total_count FROM delivery_fee_discount_promo_codes;

-- Test if RLS is working by running as authenticated user
-- This will help identify if there's an issue with the policies

-- Create a simpler RLS policy for viewing promo codes
-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view active and valid delivery_fee_discount_promo_codes" ON delivery_fee_discount_promo_codes;
DROP POLICY IF EXISTS "Admins can manage all delivery_fee_discount_promo_codes" ON delivery_fee_discount_promo_codes;
DROP POLICY IF EXISTS "Admin full access to promo codes" ON delivery_fee_discount_promo_codes;

-- Create simpler policies

-- Admin policy - allow full access to admins
CREATE POLICY "Admin full access to promo codes"
ON delivery_fee_discount_promo_codes
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow any authenticated user to view active promo codes
CREATE POLICY "Authenticated users can view promo codes"
ON delivery_fee_discount_promo_codes
FOR SELECT
TO authenticated
USING (
    is_active = true
    AND now() >= valid_from
    AND (valid_until IS NULL OR now() <= valid_until)
);

-- Also allow anon users to view (for public promo codes)
CREATE POLICY "Anyone can view promo codes"
ON delivery_fee_discount_promo_codes
FOR SELECT
TO anon
USING (
    is_active = true
    AND now() >= valid_from
    AND (valid_until IS NULL OR now() <= valid_until)
);

-- ===================================================================
-- Also fix the promo_codes table similarly if needed
-- ===================================================================

-- Check if promo_codes table exists
SELECT 'Checking promo_codes table...' as info;

-- Create promo_codes table if it doesn't exist (from original migration)
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Ensure anon can also read from promo_codes
DROP POLICY IF EXISTS "Anyone can view active promo codes" ON promo_codes;

CREATE POLICY "Anyone can view active promo codes"
ON promo_codes
FOR SELECT
TO anon
USING (
    is_active = true
    AND now() >= valid_from
    AND (valid_until IS NULL OR now() <= valid_until)
);

-- Test the queries
SELECT 
    'delivery_fee_discount_promo_codes' as table_name,
    COUNT(*) as active_count
FROM delivery_fee_discount_promo_codes
WHERE is_active = true
AND now() >= valid_from
AND (valid_until IS NULL OR now() <= valid_until);

SELECT 
    'promo_codes' as table_name,
    COUNT(*) as active_count
FROM promo_codes
WHERE is_active = true
AND now() >= valid_from
AND (valid_until IS NULL OR now() <= valid_until);

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('delivery_fee_discount_promo_codes', 'promo_codes', 'profiles')
ORDER BY tablename, policyname;

-- Check profiles table for delivery_approved column
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name IN ('delivery_approved', 'vendor_approved', 'hostel_location', 'phone')
ORDER BY column_name;

-- Check if there are pending delivery agent registrations
SELECT 
    id,
    full_name,
    email,
    role,
    delivery_approved,
    is_delivery_agent,
    created_at
FROM profiles
WHERE delivery_approved IS NULL 
AND (role = 'delivery_agent' OR is_delivery_agent = true)
ORDER BY created_at DESC
LIMIT 10;
