-- Add UPDATE policies for delivery agents to accept orders
-- Run this in Supabase SQL Editor

-- === STEP 1: Create UPDATE policy for delivery agents to accept/update orders ===
-- This allows agents to:
-- - Accept unassigned orders (delivery_agent_id is null and status is pending)
-- - Update status and any fields for already assigned orders

DROP POLICY IF EXISTS "Delivery agents can accept orders" ON orders;
DROP POLICY IF EXISTS "Delivery agents can update assigned orders" ON orders;

CREATE POLICY "Delivery agents can accept orders" ON orders
  FOR UPDATE
  USING (
    -- Allow update if:
    -- 1. Agent is a delivery agent (has profile with delivery_agent role)
    -- AND
    -- 2. Either order is not assigned OR order is assigned to this agent
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'delivery_agent'
    )
    AND (
      delivery_agent_id IN (
        SELECT id FROM delivery_agents
        WHERE user_id = auth.uid()
      )
      OR (delivery_agent_id IS NULL AND status = 'pending')
    )
  )
  WITH CHECK (
    -- Allow any update for assigned orders
    -- Allow accepting unassigned orders (setting delivery_agent_id)
    EXISTS (
      SELECT 1 FROM delivery_agents
      WHERE user_id = auth.uid()
      AND (
        orders.delivery_agent_id = delivery_agents.id
        OR (orders.delivery_agent_id IS NULL AND orders.status = 'pending')
      )
    )
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
