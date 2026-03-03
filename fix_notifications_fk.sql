-- Fix: Remove FK constraint from notifications table that's blocking order creation
-- Run this in Supabase SQL Editor

-- Option 1: Drop the foreign key constraint (quick fix)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Option 2: Or make user_id nullable (if you want to keep the table structure)
-- ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

-- Verify the constraint was removed
SELECT conname FROM pg_constraint 
WHERE conname = 'notifications_user_id_fkey';
