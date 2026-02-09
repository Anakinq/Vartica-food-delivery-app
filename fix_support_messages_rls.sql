-- Fix RLS policy for support_messages table to allow authenticated customers to insert messages
-- This fixes the error: "new row violates row-level security policy for table 'support_messages'"

-- First, enable RLS on support_messages if not already enabled
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be blocking inserts (if they exist)
DROP POLICY IF EXISTS "Users their own support messages can view" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all support messages" ON support_messages;
DROP POLICY IF EXISTS "Anyone can insert support messages" ON support_messages;
DROP POLICY IF EXISTS "Authenticated users can insert" ON support_messages;
DROP POLICY IF EXISTS "Admins can update support messages" ON support_messages;
DROP POLICY IF EXISTS "Authenticated customers can insert support messages" ON support_messages;

-- Create policy to allow authenticated users to insert support messages
CREATE POLICY "Authenticated customers can insert support messages"
ON support_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to view their own support messages
CREATE POLICY "Users can view their own support messages"
ON support_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy to allow admins to view all support messages
CREATE POLICY "Admins can view all support messages"
ON support_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create policy to allow admins to update support messages (mark as resolved)
CREATE POLICY "Admins can update support messages"
ON support_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
