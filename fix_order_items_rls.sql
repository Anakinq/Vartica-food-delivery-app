-- Fix RLS policy to allow customers to create order items
-- Run this in Supabase SQL Editor

-- Enable RLS on order_items if not already enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be blocking customers
DROP POLICY IF EXISTS "Customers can create order items" ON order_items;
DROP POLICY IF EXISTS "Customers can view own order items" ON order_items;

-- Add policy to allow customers to insert order items
-- This works by joining with orders table where the customer is the order owner
CREATE POLICY "Customers can create order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Add policy to allow customers to view their order items through their orders
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
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'order_items'
AND policyname LIKE 'Customers%';
