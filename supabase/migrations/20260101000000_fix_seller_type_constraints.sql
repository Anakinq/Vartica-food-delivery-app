-- Fix seller_type constraints to include late_night_vendor
-- This addresses the inconsistency between application code and database schema

-- Update menu_items table to include late_night_vendor in seller_type
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_seller_type_check;
ALTER TABLE menu_items ADD CONSTRAINT menu_items_seller_type_check 
CHECK (seller_type IN ('cafeteria', 'vendor', 'late_night_vendor'));

-- Update orders table to include late_night_vendor in seller_type  
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_seller_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_seller_type_check 
CHECK (seller_type IN ('cafeteria', 'vendor', 'late_night_vendor'));

-- Fix delivery_ratings table foreign key reference
-- First, drop the existing constraint
ALTER TABLE delivery_ratings DROP CONSTRAINT IF EXISTS delivery_ratings_delivery_agent_id_fkey;

-- Add correct foreign key reference to delivery_agents table
ALTER TABLE delivery_ratings ADD CONSTRAINT delivery_ratings_delivery_agent_id_fkey 
FOREIGN KEY (delivery_agent_id) REFERENCES delivery_agents(id) ON DELETE CASCADE;