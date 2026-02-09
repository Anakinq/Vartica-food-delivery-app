-- Complete marketplace fix - Run this in Supabase SQL Editor
-- This fixes: columns, RLS policies, and updates existing orders

-- === STEP 1: Add missing columns to orders table ===
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_handler text DEFAULT 'agent' CHECK (delivery_handler IN ('vendor', 'agent'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_discount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_earnings numeric DEFAULT 200;

-- === STEP 2: Update existing orders with delivery_handler ===
UPDATE orders SET delivery_handler = 'agent' WHERE delivery_handler IS NULL;

-- === STEP 3: Enable RLS on orders table ===
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- === STEP 4: Drop existing policies ===
DROP POLICY IF EXISTS "Customers can create orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;

-- === STEP 5: Create RLS policies for orders ===

-- Customers can create orders
CREATE POLICY "Customers can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Vendors can view orders for their store
CREATE POLICY "Vendors can view own store orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vendors
    WHERE vendors.id = orders.seller_id
    AND vendors.user_id = auth.uid()
  )
);

-- Vendors can update their own store orders
CREATE POLICY "Vendors can update own store orders"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM vendors
    WHERE vendors.id = orders.seller_id
    AND vendors.user_id = auth.uid()
  )
);

-- Delivery agents can view assigned orders
CREATE POLICY "Agents can view assigned orders"
ON orders FOR SELECT
USING (
  delivery_agent_id = auth.uid()
);

-- Delivery agents can update assigned orders
CREATE POLICY "Agents can update assigned orders"
ON orders FOR UPDATE
USING (
  delivery_agent_id = auth.uid()
);

-- === STEP 6: Enable RLS on order_items table ===
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can create order items" ON order_items;
DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;

-- Customers can insert order items (through their orders)
CREATE POLICY "Customers can create order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Customers can view their order items
CREATE POLICY "Customers can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Vendors can view order items for their orders
CREATE POLICY "Vendors can view order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    JOIN vendors ON vendors.id = orders.seller_id
    WHERE orders.id = order_items.order_id
    AND vendors.user_id = auth.uid()
  )
);

-- === STEP 7: Verify the setup ===
SELECT 'Orders table RLS policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'orders';

SELECT 'Order items table RLS policies:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'order_items';

SELECT 'Orders with delivery_handler:' as info;
SELECT seller_type, delivery_handler, COUNT(*) as count
FROM orders
GROUP BY seller_type, delivery_handler;
