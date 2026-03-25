-- ============================================
-- SQL FIXES FOR VARTICA FOOD DELIVERY APP
-- Issues: #1 (Male Medical Halls) and #7 (Remove Medical Cafeteria)
-- ============================================

-- ============================================
-- ISSUE #1: Add Male Medical Hall 1 and Male Medical Hall 2
-- ============================================

-- First, check the current hostel_locations table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hostel_locations';

-- Add Male Medical Hall 1 and Male Medical Hall 2 (with same delivery fee)
INSERT INTO hostel_locations (name, group_name, base_delivery_fee, sort_order)
VALUES 
    ('Male Medical Hall 1', 'MALE_MEDICAL_HALL', 2000, 7),
    ('Male Medical Hall 2', 'MALE_MEDICAL_HALL', 2000, 8)
ON CONFLICT (name) DO NOTHING;

-- If the table uses a different schema, try this alternative:
-- INSERT INTO hostel_locations (name, location_group, delivery_fee, display_order)
-- VALUES 
--     ('Male Medical Hall 1', 'MALE_MEDICAL_HALL', 2000, 7),
--     ('Male Medical Hall 2', 'MALE_MEDICAL_HALL', 2000, 8)
-- ON CONFLICT (name) DO NOTHING;

-- Verify the insert worked
SELECT name, group_name, base_delivery_fee 
FROM hostel_locations 
WHERE name LIKE '%Male Medical%'
ORDER BY name;

-- ============================================
-- ISSUE #7: Remove "Medical Cafeteria" - Keep "Med Cafeteria"
-- ============================================

-- First, check current cafeteria names
SELECT id, name, description, is_active 
FROM cafeterias 
WHERE name LIKE '%Cafeteria%' OR name LIKE '%Medical%'
ORDER BY name;

-- Option A: Rename "Medical Cafeteria" to "Med Cafeteria" if it exists
UPDATE cafeterias 
SET name = 'Med Cafeteria', 
    description = 'Medical campus dining - Med Cafeteria'
WHERE name = 'Medical Cafeteria';

-- Option B: If "Med Cafeteria" already exists and you want to keep it, 
-- deactivate/remove "Medical Cafeteria" instead:
-- UPDATE cafeterias 
-- SET is_active = false
-- WHERE name = 'Medical Cafeteria';

-- Or delete if not needed:
-- DELETE FROM cafeterias WHERE name = 'Medical Cafeteria';

-- Verify the changes
SELECT id, name, description, is_active 
FROM cafeterias 
ORDER BY name;

-- ============================================
-- UPDATE PRICING MATRIX FOR NEW HOSTELS
-- ============================================

-- Add pricing for Male Medical Hall 1 and Male Medical Hall 2
-- This assumes there's a delivery_pricing or similar table

-- Check the pricing table structure
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%pricing%';

-- If there's a pricing matrix table, add entries for the new hostels
-- Example (adjust table name as needed):
-- INSERT INTO delivery_pricing (cafeteria_id, hostel_id, fee)
-- SELECT 
--     c.id,
--     h.id,
--     2000
-- FROM cafeterias c, hostel_locations h
-- WHERE h.name IN ('Male Medical Hall 1', 'Male Medical Hall 2')
-- ON CONFLICT DO NOTHING;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

-- List all hostels
SELECT name, group_name, base_delivery_fee 
FROM hostel_locations 
ORDER BY sort_order;

-- List all cafeterias
SELECT name, is_active 
FROM cafeterias 
ORDER BY name;
