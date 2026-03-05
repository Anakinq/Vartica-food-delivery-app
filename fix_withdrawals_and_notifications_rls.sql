-- ============================================================================
-- COMPREHENSIVE FIX: Withdrawals RLS + Notifications 403 Fix
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: FIX WITHDRAWALS TABLE RLS POLICIES
-- ============================================================================

-- Step 1: Drop ALL existing policies on withdrawals (ignore errors if not exist)
DROP POLICY IF EXISTS "Agents can view own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Agents can view their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Agents can insert own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Agents can insert their own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Admins can view all withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Admins can update withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Service role can manage all withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Agents can view own withdrawals extended" ON withdrawals;
DROP POLICY IF EXISTS "Agents can create own withdrawals extended" ON withdrawals;

-- Step 2: Enable RLS on withdrawals table
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies for withdrawals
-- Agents can view their own withdrawals
CREATE POLICY "Agents can view own withdrawals" ON withdrawals
    FOR SELECT TO authenticated
    USING (
        agent_id IN (SELECT id FROM delivery_agents WHERE user_id = auth.uid())
    );

-- Agents can create their own withdrawals
CREATE POLICY "Agents can insert own withdrawals" ON withdrawals
    FOR INSERT TO authenticated
    WITH CHECK (
        agent_id IN (SELECT id FROM delivery_agents WHERE user_id = auth.uid())
    );

-- Admins can view ALL withdrawals
CREATE POLICY "Admins can view all withdrawals" ON withdrawals
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can UPDATE (approve/reject/mark as sent) ALL withdrawals
CREATE POLICY "Admins can update withdrawals" ON withdrawals
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Service role can do everything
CREATE POLICY "Service role can manage all withdrawals" ON withdrawals
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Step 4: Grant table permissions
GRANT ALL ON withdrawals TO authenticated;
GRANT ALL ON withdrawals TO anon;
GRANT ALL ON withdrawals TO service_role;

-- ============================================================================
-- PART 2: FIX NOTIFICATIONS TABLE (403 Forbidden Fix)
-- ============================================================================

-- Step 1: Drop ALL existing policies on notifications (ignore errors)
DROP POLICY IF EXISTS "Allow all inserts" ON notifications;
DROP POLICY IF EXISTS "Allow all inserts anon" ON notifications;
DROP POLICY IF EXISTS "Allow all select authenticated" ON notifications;
DROP POLICY IF EXISTS "Allow all select anon" ON notifications;
DROP POLICY IF EXISTS "Allow all update authenticated" ON notifications;
DROP POLICY IF EXISTS "Allow all delete authenticated" ON notifications;
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

-- Step 2: Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create permissive policies for notifications
-- Allow authenticated users to insert notifications
CREATE POLICY "Allow authenticated insert" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to select
CREATE POLICY "Allow authenticated select" ON notifications
    FOR SELECT TO authenticated
    USING (true);

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON notifications
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete" ON notifications
    FOR DELETE TO authenticated
    USING (true);

-- Allow anon to select (for public notifications if needed)
CREATE POLICY "Allow anon select" ON notifications
    FOR SELECT TO anon
    USING (true);

-- Step 4: Grant table permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;
GRANT ALL ON notifications TO service_role;

-- ============================================================================
-- PART 3: VERIFICATION
-- ============================================================================
SELECT 'Withdrawals policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'withdrawals';

SELECT 'Notifications policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications';
