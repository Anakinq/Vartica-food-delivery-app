-- ============================================================================
-- PART 2: RLS Policies with Proper Error Handling
-- ============================================================================
-- This file creates RLS policies with proper error handling to avoid
-- "policy already exists" errors that occur with DROP POLICY IF EXISTS
-- in Supabase.
--
-- Uses DO blocks to safely check and create policies only if they don't exist
-- ============================================================================
-- Run this SECOND in Supabase SQL Editor (after Part 1)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Enable RLS on withdrawals table (from Part 1)
-- ============================================================================

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 2: Withdrawals RLS Policies with Error Handling
-- ============================================================================

-- Policy: "Agents can view own withdrawals"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Agents can view own withdrawals' 
        AND tablename = 'withdrawals'
    ) THEN
        CREATE POLICY "Agents can view own withdrawals" ON withdrawals
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM delivery_agents
                    WHERE delivery_agents.id = withdrawals.agent_id
                    AND delivery_agents.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy: "Agents can insert own withdrawals"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Agents can insert own withdrawals' 
        AND tablename = 'withdrawals'
    ) THEN
        CREATE POLICY "Agents can insert own withdrawals" ON withdrawals
            FOR INSERT TO authenticated
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM delivery_agents
                    WHERE delivery_agents.id = withdrawals.agent_id
                    AND delivery_agents.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy: "Admins can view all withdrawals"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Admins can view all withdrawals' 
        AND tablename = 'withdrawals'
    ) THEN
        CREATE POLICY "Admins can view all withdrawals" ON withdrawals
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;

-- Policy: "Service role can manage all withdrawals"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role can manage all withdrawals' 
        AND tablename = 'withdrawals'
    ) THEN
        CREATE POLICY "Service role can manage all withdrawals" ON withdrawals
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: agent_wallets RLS Policies with Error Handling
-- ============================================================================

ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;

-- Policy: "Agents can view own wallet"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Agents can view own wallet' 
        AND tablename = 'agent_wallets'
    ) THEN
        CREATE POLICY "Agents can view own wallet" ON agent_wallets
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM delivery_agents
                    WHERE delivery_agents.id = agent_wallets.agent_id
                    AND delivery_agents.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy: "Agents can update own wallet"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Agents can update own wallet' 
        AND tablename = 'agent_wallets'
    ) THEN
        CREATE POLICY "Agents can update own wallet" ON agent_wallets
            FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM delivery_agents
                    WHERE delivery_agents.id = agent_wallets.agent_id
                    AND delivery_agents.user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM delivery_agents
                    WHERE delivery_agents.id = agent_wallets.agent_id
                    AND delivery_agents.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy: "Service role can manage agent wallets"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role can manage agent wallets' 
        AND tablename = 'agent_wallets'
    ) THEN
        CREATE POLICY "Service role can manage agent wallets" ON agent_wallets
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: vendor_wallets RLS Policies with Error Handling
-- ============================================================================

ALTER TABLE vendor_wallets ENABLE ROW LEVEL SECURITY;

-- Policy: "Vendors can view own wallet"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Vendors can view own wallet' 
        AND tablename = 'vendor_wallets'
    ) THEN
        CREATE POLICY "Vendors can view own wallet" ON vendor_wallets
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM vendors
                    WHERE vendors.id = vendor_wallets.vendor_id
                    AND vendors.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy: "Vendors can update own wallet"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Vendors can update own wallet' 
        AND tablename = 'vendor_wallets'
    ) THEN
        CREATE POLICY "Vendors can update own wallet" ON vendor_wallets
            FOR UPDATE TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM vendors
                    WHERE vendors.id = vendor_wallets.vendor_id
                    AND vendors.user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM vendors
                    WHERE vendors.id = vendor_wallets.vendor_id
                    AND vendors.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Policy: "Service role can manage vendor wallets"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Service role can manage vendor wallets' 
        AND tablename = 'vendor_wallets'
    ) THEN
        CREATE POLICY "Service role can manage vendor wallets" ON vendor_wallets
            FOR ALL TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- Part 2 Complete - Continue with Part 3 for permissions
-- ============================================================================

COMMIT;

SELECT '=== PART 2 COMPLETED: RLS Policies Created with Error Handling ===' as status;

-- Verify RLS policies were created
SELECT 'RLS Policies on withdrawals:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'withdrawals';

SELECT 'RLS Policies on agent_wallets:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'agent_wallets';

SELECT 'RLS Policies on vendor_wallets:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'vendor_wallets';
