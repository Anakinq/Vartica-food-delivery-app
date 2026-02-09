-- Fix chat_messages RLS policies to use user_id instead of customer_id
-- Run this in Supabase SQL Editor
-- This safely drops ALL existing chat policies first

-- Drop ALL existing chat_messages policies
DROP POLICY IF EXISTS "Order participants and customer-vendor can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Order participants and customer-vendor can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Order participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Order participants can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can view all chat messages" ON chat_messages;

-- Create new INSERT policy using user_id
CREATE POLICY "Order participants can send messages" ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND (
      -- Customer participating in the order (using user_id)
      orders.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM delivery_agents
        WHERE delivery_agents.user_id = auth.uid()
        AND orders.delivery_agent_id = delivery_agents.id
      )
      OR EXISTS (
        SELECT 1 FROM vendors
        WHERE vendors.user_id = auth.uid()
        AND orders.seller_id = vendors.id
        AND orders.seller_type = 'vendor'
      )
    )
  )
);

-- Create new SELECT policy using user_id
CREATE POLICY "Order participants can view messages" ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND (
      -- Customer participating in the order (using user_id)
      orders.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM delivery_agents
        WHERE delivery_agents.user_id = auth.uid()
        AND orders.delivery_agent_id = delivery_agents.id
      )
      OR EXISTS (
        SELECT 1 FROM vendors
        WHERE vendors.user_id = auth.uid()
        AND orders.seller_id = vendors.id
        AND orders.seller_type = 'vendor'
      )
    )
  )
);

-- Admin can view all messages
CREATE POLICY "Admin can view all chat messages" ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verify policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'chat_messages';
