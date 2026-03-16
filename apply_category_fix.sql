-- =====================================================
-- Fix for 409 Conflict: menu_items category_id foreign key error
-- Error: "Key (category_id)=(...) is not present in table "vendor_categories""
-- 
-- This script fixes the issue by:
-- 1. Dropping the problematic foreign key constraint
-- 2. Creating default categories for vendors that don't have any
-- 3. Cleaning up invalid category references in menu_items
-- 4. Re-adding the foreign key with proper ON DELETE SET NULL behavior
-- =====================================================

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- Step 2: Add default "General" category for vendors that don't have any categories
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

-- Step 3: Update menu_items with invalid category_id to use NULL
UPDATE menu_items
SET category_id = NULL
WHERE category_id IS NOT NULL 
AND category_id NOT IN (SELECT id FROM vendor_categories);

-- Step 4: Re-add the foreign key with ON DELETE SET NULL
ALTER TABLE menu_items 
ADD CONSTRAINT menu_items_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES vendor_categories(id) 
ON DELETE SET NULL;

-- =====================================================
-- Verification Queries (copy and run these separately)
-- =====================================================

-- Check if any menu items still have invalid category_id
-- This should return 0 rows after the fix
-- SELECT mi.id, mi.name, mi.category_id
-- FROM menu_items mi
-- WHERE mi.category_id IS NOT NULL 
-- AND mi.category_id NOT IN (SELECT id FROM vendor_categories);

-- List all vendor categories
-- SELECT vc.id, vc.vendor_id, v.name as vendor_name, vc.name as category_name, vc.is_active
-- FROM vendor_categories vc
-- JOIN vendors v ON vc.vendor_id = v.id
-- ORDER BY v.name, vc.sort_order;

-- List vendors without categories (should be empty after fix)
-- SELECT v.id, v.name, v.vendor_type
-- FROM vendors v
-- WHERE NOT EXISTS (
--     SELECT 1 FROM vendor_categories vc WHERE vc.vendor_id = v.id
-- );
