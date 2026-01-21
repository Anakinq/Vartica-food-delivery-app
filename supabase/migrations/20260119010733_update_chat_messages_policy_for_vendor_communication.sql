-- Update chat_messages policy to allow customer-vendor communication

-- First, drop the existing policy
DROP POLICY IF EXISTS "Order participants can send messages" ON chat_messages;

-- Create a new policy that allows both customer-delivery agent and customer-vendor communication
CREATE POLICY "Order participants and customer-vendor can send messages" ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND (
      -- Original condition: customer or delivery agent participating in the order
      orders.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM delivery_agents
        WHERE delivery_agents.user_id = auth.uid()
        AND orders.delivery_agent_id = delivery_agents.id
      )
      OR EXISTS (
        -- New condition: vendor associated with the order
        SELECT 1 FROM vendors
        WHERE vendors.user_id = auth.uid()
        AND orders.seller_id = vendors.id
        AND orders.seller_type = 'vendor'
      )
    )
  )
);

-- Also update the select policy to allow customer-vendor communication
DROP POLICY IF EXISTS "Order participants can view messages" ON chat_messages;

CREATE POLICY "Order participants and customer-vendor can view messages" ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND (
      -- Original condition: customer or delivery agent participating in the order
      orders.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM delivery_agents
        WHERE delivery_agents.user_id = auth.uid()
        AND orders.delivery_agent_id = delivery_agents.id
      )
      OR EXISTS (
        -- New condition: vendor associated with the order
        SELECT 1 FROM vendors
        WHERE vendors.user_id = auth.uid()
        AND orders.seller_id = vendors.id
        AND orders.seller_type = 'vendor'
      )
    )
  )
);