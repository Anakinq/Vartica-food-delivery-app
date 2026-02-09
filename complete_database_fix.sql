-- Complete database fix for customer_id/user_id consistency
-- Run this in Supabase SQL Editor
-- Note: Tables that don't exist will be skipped automatically

-- ============================================
-- STEP 1: Add customer_id column to orders table
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id);

-- Update existing orders to set customer_id = user_id
UPDATE orders SET customer_id = user_id WHERE customer_id IS NULL;

-- ============================================
-- STEP 2: Add missing columns for marketplace
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_handler TEXT DEFAULT 'agent';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_earnings DECIMAL(10,2) DEFAULT 0;

-- ============================================
-- STEP 3: Add indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_handler ON orders(delivery_handler);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- ============================================
-- STEP 4: Fix orders RLS policies
-- ============================================
-- Drop existing orders policies
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can view own store orders" ON orders;
DROP POLICY IF EXISTS "Delivery agents can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Customers can update own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can update own store orders" ON orders;

-- Customers can view own orders
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = customer_id);

-- Customers can update own orders (for payment status)
CREATE POLICY "Customers can update own orders" ON orders
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = customer_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = customer_id);

-- Vendors can view orders for their store
CREATE POLICY "Vendors can view own store orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = orders.seller_id
      AND vendors.user_id = auth.uid()
    )
  );

-- Vendors can update own store orders
CREATE POLICY "Vendors can update own store orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vendors
      WHERE vendors.id = orders.seller_id
      AND vendors.user_id = auth.uid()
    )
  );

-- Delivery agents can view assigned orders
CREATE POLICY "Delivery agents can view assigned orders" ON orders
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM delivery_agents WHERE id = orders.delivery_agent_id
  ));

-- Delivery agents can update assigned orders
CREATE POLICY "Delivery agents can update assigned orders" ON orders
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM delivery_agents WHERE id = orders.delivery_agent_id
  ));

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- STEP 5: Fix order_items RLS policies
-- ============================================
DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
DROP POLICY IF EXISTS "Vendors can view own store order items" ON order_items;
DROP POLICY IF EXISTS "Delivery agents can view order items" ON order_items;

-- Customers can view order items from their orders
CREATE POLICY "Customers can view own order items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR orders.customer_id = auth.uid())
    )
  );

-- Vendors can view order items from their store orders
CREATE POLICY "Vendors can view own store order items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN vendors ON vendors.id = orders.seller_id
      WHERE orders.id = order_items.order_id
      AND vendors.user_id = auth.uid()
    )
  );

-- Delivery agents can view order items from assigned orders
CREATE POLICY "Delivery agents can view order items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.delivery_agent_id IN (
        SELECT id FROM delivery_agents WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- STEP 6: Fix chat_messages RLS policies
-- ============================================
DROP POLICY IF EXISTS "Order participants and customer-vendor can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Order participants and customer-vendor can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Order participants can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Order participants can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can view all chat messages" ON chat_messages;

-- Order participants can send messages
CREATE POLICY "Order participants can send messages" ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND (
      orders.user_id = auth.uid()
      OR orders.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM delivery_agents
        WHERE delivery_agents.user_id = auth.uid()
        AND orders.delivery_agent_id = delivery_agents.id
      )
      OR EXISTS (
        SELECT 1 FROM vendors
        WHERE vendors.user_id = auth.uid()
        AND orders.seller_id = vendors.id
      )
    )
  )
);

-- Order participants can view messages
CREATE POLICY "Order participants can view messages" ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND (
      orders.user_id = auth.uid()
      OR orders.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM delivery_agents
        WHERE delivery_agents.user_id = auth.uid()
        AND orders.delivery_agent_id = delivery_agents.id
      )
      OR EXISTS (
        SELECT 1 FROM vendors
        WHERE vendors.user_id = auth.uid()
        AND orders.seller_id = vendors.id
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

-- ============================================
-- STEP 7: Fix vendor_reviews RLS policies (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vendor_reviews') THEN
    DROP POLICY IF EXISTS "Customers can view own reviews" ON vendor_reviews;
    DROP POLICY IF EXISTS "Vendors can view reviews for their store" ON vendor_reviews;

    -- Customers can view their own reviews
    CREATE POLICY "Customers can view own reviews" ON vendor_reviews
      FOR SELECT
      USING (auth.uid() = customer_id);

    -- Vendors can view reviews for their store
    CREATE POLICY "Vendors can view reviews for their store" ON vendor_reviews
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM vendors
          WHERE vendors.id = vendor_reviews.vendor_id
          AND vendors.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- STEP 8: Fix delivery_ratings RLS policies (if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'delivery_ratings') THEN
    DROP POLICY IF EXISTS "Customers can view own delivery ratings" ON delivery_ratings;
    DROP POLICY IF EXISTS "Delivery agents can view their ratings" ON delivery_ratings;

    -- Customers can view their own ratings
    CREATE POLICY "Customers can view own delivery ratings" ON delivery_ratings
      FOR SELECT
      USING (auth.uid() = customer_id);

    -- Delivery agents can view their ratings
    CREATE POLICY "Delivery agents can view their ratings" ON delivery_ratings
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = delivery_ratings.delivery_agent_id
          AND profiles.id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Orders table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

SELECT 'Orders RLS policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'orders';

SELECT 'Chat messages RLS policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'chat_messages';

SELECT 'Order items RLS policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'order_items';
