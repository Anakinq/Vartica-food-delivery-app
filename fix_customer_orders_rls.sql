-- Fix RLS policy to allow customers to create orders
-- Run this in Supabase SQL Editor

-- Drop existing policies that might be blocking customers
DROP POLICY IF EXISTS "Customers can create orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;

-- Add policy to allow customers to insert orders
CREATE POLICY "Customers can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow customers to view their own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Verify the policies are created
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'orders'
AND policyname LIKE 'Customers%';
