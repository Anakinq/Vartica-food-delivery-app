-- Fix: Address 409 Conflict error when creating orders
-- This can be caused by triggers or unique constraints

-- Check if there are any triggers on the orders table that might be causing conflicts
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders';

-- Check for unique constraints on orders table
SELECT 
    tc.constraint_name, 
    kcu.column_name,
    tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'orders' 
    AND tc.constraint_type = 'UNIQUE';

-- If there's a unique constraint on order_number, ensure it's working properly
-- This ensures no duplicate orders can be created
-- Note: The application should handle the case where an order with the same number might exist

-- Add a function to safely generate unique order numbers if needed
-- This can be used by the application to avoid 409 conflicts

-- If you're using triggers to generate order numbers, ensure they use ON CONFLICT properly
-- Example trigger fix (if applicable):
/*
CREATE OR REPLACE FUNCTION handle_order_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Your trigger logic here
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Handle the conflict gracefully
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;
*/

-- For immediate fix, you can also add an index with ON CONFLICT ignore
-- This will silently skip inserts that would cause conflicts
-- Note: This should only be used as a temporary measure

-- Alternatively, you can modify your application code to:
-- 1. Check if order exists before inserting
-- 2. Use ON CONFLICT DO NOTHING in the insert statement
-- 3. Handle the 409 error gracefully with a retry mechanism

-- Example SQL that can be used in application for safe insert:
/*
INSERT INTO orders (order_number, user_id, seller_id, ...)
VALUES (?, ?, ?, ...)
ON CONFLICT (order_number) DO NOTHING
RETURNING id;
*/
