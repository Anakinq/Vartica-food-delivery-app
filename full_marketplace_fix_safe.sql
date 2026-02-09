-- Safe marketplace fix - drops existing policies first
-- Run this in Supabase SQL Editor

-- === STEP 0: Drop existing RLS policies (if any) ===
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can view own store orders" ON orders;
DROP POLICY IF EXISTS "Delivery agents can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;
DROP POLICY IF EXISTS "Vendors can view own store order items" ON order_items;
DROP POLICY IF EXISTS "Delivery agents can view order items" ON order_items;

-- === STEP 1: Add missing columns to orders table ===
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_handler TEXT DEFAULT 'agent';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_earnings DECIMAL(10,2) DEFAULT 0;

-- === STEP 2: Update existing orders to set customer_id and delivery_handler ===
UPDATE orders SET customer_id = user_id WHERE customer_id IS NULL AND user_id IS NOT NULL;
UPDATE orders SET delivery_handler = 'agent' WHERE delivery_handler IS NULL;

-- === STEP 3: Add indexes for performance ===
CREATE INDEX IF NOT EXISTS idx_orders_delivery_handler ON orders(delivery_handler);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_agent_id ON orders(delivery_agent_id);

-- === STEP 4: Enable RLS on orders table ===
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- === STEP 5: Create RLS policies for orders ===
-- Customers can view their own orders
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

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

-- Delivery agents can view assigned orders
CREATE POLICY "Delivery agents can view assigned orders" ON orders
  FOR SELECT
  USING (auth.uid() = delivery_agent_id);

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

-- === STEP 6: Enable RLS on order_items table ===
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- === STEP 7: Create RLS policies for order_items ===
-- Customers can view order items from their orders
CREATE POLICY "Customers can view own order items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
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
      AND orders.delivery_agent_id = auth.uid()
    )
  );

-- === STEP 8: Verify the setup ===
SELECT 'Orders table columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

SELECT 'Orders with delivery_handler:' as info;
SELECT seller_type, delivery_handler, COUNT(*) as count
FROM orders
GROUP BY seller_type, delivery_handler;

SELECT 'Orders table RLS policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'orders';

SELECT 'Order items table RLS policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'order_items';
