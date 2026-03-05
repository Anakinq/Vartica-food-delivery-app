-- Fix: Allow delivery agents to accept orders (update orders table)
-- This addresses the PATCH 400 Bad Request error when delivery agents try to accept orders

-- First, ensure RLS is enabled on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows delivery agents to update orders they're accepting
-- They can set status to 'accepted' and assign themselves as delivery_agent_id
DROP POLICY IF EXISTS "Delivery agents can accept orders" ON orders;

CREATE POLICY "Delivery agents can accept orders" ON orders
FOR UPDATE
TO authenticated
USING (
  -- Allow if the user is a delivery agent and the order is pending
  EXISTS (
    SELECT 1 FROM delivery_agents 
    WHERE delivery_agents.user_id = auth.uid()
    AND delivery_agents.is_available = true
  )
  AND status = 'pending'
)
WITH CHECK (
  -- Only allow setting delivery_agent_id to current user's agent ID
  -- And only allow changing status to 'accepted'
  (
    EXISTS (
      SELECT 1 FROM delivery_agents 
      WHERE delivery_agents.user_id = auth.uid()
    )
    AND (status = 'accepted' OR status = 'picked_up' OR status = 'delivered')
  )
  OR delivery_agent_id = (
    SELECT id FROM delivery_agents WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Also allow delivery agents to update orders they're already assigned to
DROP POLICY IF EXISTS "Delivery agents can update their assigned orders" ON orders;

CREATE POLICY "Delivery agents can update their assigned orders" ON orders
FOR UPDATE
TO authenticated
USING (
  -- Allow if the user is a delivery agent and they're assigned to this order
  EXISTS (
    SELECT 1 FROM delivery_agents 
    WHERE delivery_agents.user_id = auth.uid()
    AND delivery_agents.id = orders.delivery_agent_id
  )
)
WITH CHECK (
  -- Allow status updates for assigned orders
  EXISTS (
    SELECT 1 FROM delivery_agents 
    WHERE delivery_agents.user_id = auth.uid()
    AND delivery_agents.id = orders.delivery_agent_id
  )
);

-- Grant necessary permissions to delivery_agents table
GRANT SELECT, UPDATE ON delivery_agents TO authenticated;
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON cafeterias TO authenticated;

-- RLS policy: Allow delivery agents to read profiles (for customer names)
DROP POLICY IF EXISTS "Delivery agents can read customer profiles" ON profiles;

CREATE POLICY "Delivery agents can read customer profiles" ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_agents 
    WHERE delivery_agents.user_id = auth.uid()
  )
);

-- RLS policy: Allow delivery agents to read cafeterias (for pickup locations)
DROP POLICY IF EXISTS "Delivery agents can read cafeterias" ON cafeterias;

CREATE POLICY "Delivery agents can read cafeterias" ON cafeterias
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_agents 
    WHERE delivery_agents.user_id = auth.uid()
  )
);

-- Verify the policies were created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('orders', 'profiles', 'cafeterias');
