-- ============================================================================
-- FIX FOR 403 FORBIDDEN ERROR ON NOTIFICATIONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Ensure we're working with the public schema
SET search_path TO public;

-- Step 2: Drop all existing RLS policies on notifications table
DROP POLICY IF EXISTS "Allow authenticated insert" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated select" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated update" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated delete" ON notifications;
DROP POLICY IF EXISTS "Allow anon select" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;

-- Step 3: Verify RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create permissive RLS policies for all operations

-- Allow ANY insert (bypasses user_id check - needed for admin notifications to other users)
CREATE POLICY "Allow all inserts" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow all inserts anon" ON notifications
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow ALL select (for reading notifications)
CREATE POLICY "Allow all select authenticated" ON notifications
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow all select anon" ON notifications
    FOR SELECT TO anon
    USING (true);

-- Allow ALL update
CREATE POLICY "Allow all update authenticated" ON notifications
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow ALL delete
CREATE POLICY "Allow all delete authenticated" ON notifications
    FOR DELETE TO authenticated
    USING (true);

-- Step 5: Grant table permissions to all roles
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;
GRANT ALL ON notifications TO service_role;

-- Step 6: Verify the policies are set up correctly
SELECT 
    policyname, 
    cmd AS command, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'notifications';

-- Step 7: Check RLS status
SELECT 
    relname, 
    relrowsecurity 
FROM pg_class 
WHERE relname = 'notifications';
