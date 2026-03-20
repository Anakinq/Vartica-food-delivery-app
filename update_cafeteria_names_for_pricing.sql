-- ============================================
-- MIGRATION: Update Cafeteria Names for Pricing Matrix
-- Aligns cafeteria names with user specifications
-- ============================================

-- 1. Rename "Med Cafeteria" to "Medical Cafeteria"
UPDATE cafeterias 
SET name = 'Medical Cafeteria', 
    description = 'Medical campus dining hall'
WHERE name = 'Med Cafeteria';

-- 2. Rename "Staff Cafeteria" to "Cafeteria 3" (or add new)
-- First check if Cafeteria 3 already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cafeterias WHERE name = 'Cafeteria 3') THEN
        -- Rename Staff Cafeteria to Cafeteria 3
        UPDATE cafeterias 
        SET name = 'Cafeteria 3', 
            description = 'Additional campus dining facility'
        WHERE name = 'Staff Cafeteria';
    ELSE
        -- If Cafeteria 3 exists, just update Staff Cafeteria to be inactive
        UPDATE cafeterias 
        SET is_active = false
        WHERE name = 'Staff Cafeteria';
    END IF;
END $$;

-- 3. Verify the cafeteria names now match our pricing matrix
SELECT name, description, is_active 
FROM cafeterias 
WHERE is_active = true
ORDER BY name;

-- Expected cafeteria names after this migration:
-- - Cafeteria 1
-- - Cafeteria 2
-- - Cafeteria 3
-- - Captain Cook
-- - Medical Cafeteria
-- - Seasons Deli
-- - Smoothie Shack
