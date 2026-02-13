-- Add UPDATE policies for delivery agents to accept orders
-- Run this in Supabase SQL Editor

-- === STEP 1: Create UPDATE policy for delivery agents to accept orders ===
-- This allows agents to:
-- - Accept unassigned orders (delivery_agent_id is null and status is pending)
-- - Update status for already assigned orders

DROP POLICY IF EXISTS "Delivery agents can accept orders" ON orders;
DROP POLICY IF EXISTS "Delivery agents can update assigned orders" ON orders;

CREATE POLICY "Delivery agents can accept orders" ON orders
  FOR UPDATE
  USING (
    -- Allow update if agent is a delivery agent (has profile with delivery_agent role)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'delivery_agent'
    )
  )
  WITH CHECK (
    -- Allow update if:
    -- 1. Setting delivery_agent_id to self when accepting (delivery_agent_id is null)
    --    AND order is pending AND user is a delivery agent
    (delivery_agent_id IS NULL AND status = 'pending' AND EXISTS (
      SELECT 1 FROM delivery_agents
      WHERE delivery_agents.user_id = auth.uid()
    ))
    OR
    -- 2. Updating status for already assigned orders (delivery_agent_id matches agent's id)
    (delivery_agent_id IN (
      SELECT id FROM delivery_agents
      WHERE user_id = auth.uid()
    ))
  );

-- === STEP 2: Create UPDATE policy for vendors to update their orders ===
DROP POLICY IF EXISTS "Vendors can update own store orders" ON orders;

CREATE POLICY "Vendors can update own store orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = orders.seller_id
      AND vendors.user_id = auth.uid()
    )
  );

-- === STEP 3: Create UPDATE policy for customers to update their orders ===
DROP POLICY IF EXISTS "Customers can update own orders" ON orders;

CREATE POLICY "Customers can update own orders" ON orders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- === STEP 4: Verify the policies ===
SELECT 'Orders table RLS policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'orders';
