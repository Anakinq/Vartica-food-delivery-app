-- Fix RLS policies for profiles table to allow users to update their own profile
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to select their own profile
CREATE POLICY "Users can select own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Verify the policies were created
SELECT 
    'Profiles RLS policies:' as info,
    policyname as policy_name,
    cmd as command
FROM pg_policies
WHERE tablename = 'profiles';

-- Test that the profile table is accessible
SELECT 'Profile table is accessible' as result;
SELECT id, email, full_name, role, hostel_location, avatar_url 
FROM profiles 
LIMIT 1;
