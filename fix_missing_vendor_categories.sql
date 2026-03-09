-- Fix: Add missing vendor_categories and handle category_id foreign key issues
-- This fixes the error: Key (category_id)=(...) is not present in table "vendor_categories"

-- First, let's see what categories exist
-- SELECT * FROM vendor_categories;

-- Option 1: Drop the foreign key constraint to make category_id optional
-- This allows menu items without a category or with invalid category_id
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- Option 2: Add a default category for vendors that don't have one
-- Insert default categories for each vendor that doesn't have categories
INSERT INTO vendor_categories (id, vendor_id, name, category_type, sort_order, is_active, created_at)
SELECT 
    gen_random_uuid(),
    v.id,
    'General',
    'general',
    1,
    true,
    NOW()
FROM vendors v
WHERE NOT EXISTS (
    SELECT 1 FROM vendor_categories vc WHERE vc.vendor_id = v.id
);

-- Option 3: Update menu_items with invalid category_id to use null
UPDATE menu_items
SET category_id = NULL
WHERE category_id IS NOT NULL 
AND category_id NOT IN (SELECT id FROM vendor_categories);

-- Option 4: Re-add the foreign key with ON DELETE SET NULL
ALTER TABLE menu_items 
ADD CONSTRAINT menu_items_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES vendor_categories(id) 
ON DELETE SET NULL;

-- Verify the fix
-- SELECT mi.id, mi.category_id, vc.name as category_name 
-- FROM menu_items mi 
-- LEFT JOIN vendor_categories vc ON mi.category_id = vc.id
-- WHERE mi.category_id IS NOT NULL;
