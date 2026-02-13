-- Add 'ready_for_pickup' status to the orders table CHECK constraint
-- Run this in Supabase SQL Editor

-- First, drop the existing CHECK constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add the CHECK constraint with the correct status values
ALTER TABLE orders ADD CONSTRAINT orders_status_check
CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'ready_for_pickup', 'picked_up', 'delivered', 'cancelled'));
