-- Fix orders table schema to match the frontend code
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_earnings numeric DEFAULT 200;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_discount numeric DEFAULT 0;

-- Enable RLS on orders table if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be blocking customers
DROP POLICY IF EXISTS "Customers can create orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;

-- Add policy to allow customers to insert orders
CREATE POLICY "Customers can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow customers to view their own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Enable RLS on order_items table if not already enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on order_items
DROP POLICY IF EXISTS "Customers can create order items" ON order_items;
DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;

-- Add policy to allow customers to insert order items
CREATE POLICY "Customers can create order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Add policy to allow customers to view their order items
CREATE POLICY "Customers can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Verify the policies are created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items')
AND policyname LIKE 'Customers%';
