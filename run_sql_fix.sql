-- ============================================
-- SQL FIXES FOR VARTICA FOOD DELIVERY APP
-- Run this in Supabase SQL Editor
-- ============================================

-- ISSUE #1: Add Male Medical Hall 1 and Male Medical Hall 2
INSERT INTO hostel_locations (name, group_name, base_delivery_fee, sort_order)
VALUES 
    ('Male Medical Hall 1', 'MALE_MEDICAL_HALL', 2000, 7),
    ('Male Medical Hall 2', 'MALE_MEDICAL_HALL', 2000, 8)
ON CONFLICT (name) DO NOTHING;

-- ISSUE #7: Rename "Medical Cafeteria" to "Med Cafeteria"
UPDATE cafeterias 
SET name = 'Med Cafeteria', 
    description = 'Medical campus dining - Med Cafeteria'
WHERE name = 'Medical Cafeteria';

-- Verify the changes
SELECT name, group_name, base_delivery_fee 
FROM hostel_locations 
WHERE name LIKE '%Male Medical%'
ORDER BY name;

SELECT id, name, description, is_active 
FROM cafeterias 
WHERE name LIKE '%Medical%' OR name LIKE '%Med%'
ORDER BY name;