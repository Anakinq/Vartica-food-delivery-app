-- Fix for 409 Conflict: menu_items category_id foreign key error
-- This allows NULL category_id so inserts work even with stale category IDs

-- Step 1: Drop existing FK constraint
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- Step 2: Re-add FK with ON DELETE SET NULL (allows NULL values)
ALTER TABLE menu_items 
ADD CONSTRAINT menu_items_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES vendor_categories(id) 
ON DELETE SET NULL;

-- Verify the FK was created
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'menu_items' 
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'category_id';
