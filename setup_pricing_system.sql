-- ============================================
-- DELIVERY PRICING SYSTEM - FIXED FOR YOUR DB
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Fix cafeterias table
-- ============================================

-- Add unique constraint on name (required for ON CONFLICT)
ALTER TABLE cafeterias ADD CONSTRAINT cafeterias_name_unique UNIQUE (name);

-- Make user_id nullable
ALTER TABLE cafeterias ALTER COLUMN user_id DROP NOT NULL;

-- Seed cafeterias (use ON CONFLICT DO NOTHING since we now have unique constraint)
INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
(NULL, 'Cafeteria 1', 'Main campus cafeteria 1', true),
(NULL, 'Cafeteria 2', 'Main campus cafeteria 2', true),
(NULL, 'Cafeteria 3', 'Main campus cafeteria 3', true),
(NULL, 'Captain Cook', 'International cuisine vendor', true),
(NULL, 'Smoothie Shack', 'Healthy smoothies and juices', true),
(NULL, 'Medical Cafeteria', 'Medical campus dining hall', true),
(NULL, 'Seasons Deli', 'Fresh sandwiches and salads', true)
ON CONFLICT (name) DO NOTHING;

-- Verify cafeterias
SELECT 'Cafeterias:' AS info, COUNT(*) FROM cafeterias WHERE is_active = true;

-- ============================================
-- STEP 2: Create hostel_groups table (new)
-- ============================================

CREATE TABLE IF NOT EXISTS hostel_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed hostel groups
INSERT INTO hostel_groups (name, display_name, description) VALUES
    ('MALE_HALL', 'Male Hall', 'Male Halls 1-6'),
    ('MALE_MEDICAL_HALL', 'Male Medical Hall', 'Male Medical Hall'),
    ('FEMALE_HALL_1_4', 'Female Hall 1-4', 'Female Halls 1-4'),
    ('FEMALE_HALL_5A_5D', 'Female Hall 5A-5D', 'Female Halls 5A-5D'),
    ('FEMALE_MEDICAL_HALL', 'Female Medical Hall', 'Female Medical Halls 1-4')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 3: Create delivery_pricing table (new)
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafeteria_id UUID NOT NULL REFERENCES cafeterias(id) ON DELETE CASCADE,
    hostel_group_id UUID NOT NULL REFERENCES hostel_groups(id) ON DELETE CASCADE,
    price INTEGER NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cafeteria_id, hostel_group_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_delivery_pricing_lookup ON delivery_pricing(cafeteria_id, hostel_group_id) WHERE is_active = true;

-- RLS
ALTER TABLE hostel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_pricing ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Anyone can view hostel groups" ON hostel_groups FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view pricing" ON delivery_pricing FOR SELECT USING (is_active = true);

-- Admin policies
CREATE POLICY "Admin manage hostel_groups" ON hostel_groups FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin manage pricing" ON delivery_pricing FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- STEP 4: Seed pricing with YOUR EXACT PRICES
-- ============================================

INSERT INTO delivery_pricing (cafeteria_id, hostel_group_id, price)
SELECT c.id, g.id, p.price
FROM cafeterias c
CROSS JOIN hostel_groups g
LEFT JOIN (VALUES
    -- CAFETERIA 1
    ('Cafeteria 1', 'MALE_HALL', 1300),
    ('Cafeteria 1', 'MALE_MEDICAL_HALL', 1200),
    ('Cafeteria 1', 'FEMALE_HALL_1_4', 1200),
    ('Cafeteria 1', 'FEMALE_HALL_5A_5D', 1500),
    ('Cafeteria 1', 'FEMALE_MEDICAL_HALL', 1700),
    -- CAFETERIA 2
    ('Cafeteria 2', 'MALE_HALL', 1500),
    ('Cafeteria 2', 'MALE_MEDICAL_HALL', 2000),
    ('Cafeteria 2', 'FEMALE_HALL_1_4', 1000),
    ('Cafeteria 2', 'FEMALE_HALL_5A_5D', 1300),
    ('Cafeteria 2', 'FEMALE_MEDICAL_HALL', 2000),
    -- CAFETERIA 3
    ('Cafeteria 3', 'MALE_HALL', 1300),
    ('Cafeteria 3', 'MALE_MEDICAL_HALL', 1200),
    ('Cafeteria 3', 'FEMALE_HALL_1_4', 1200),
    ('Cafeteria 3', 'FEMALE_HALL_5A_5D', 1700),
    ('Cafeteria 3', 'FEMALE_MEDICAL_HALL', 1700),
    -- CAPTAIN COOK
    ('Captain Cook', 'MALE_HALL', 1300),
    ('Captain Cook', 'MALE_MEDICAL_HALL', 1200),
    ('Captain Cook', 'FEMALE_HALL_1_4', 1200),
    ('Captain Cook', 'FEMALE_HALL_5A_5D', 1500),
    ('Captain Cook', 'FEMALE_MEDICAL_HALL', 1700),
    -- SMOOTHIE SHACK
    ('Smoothie Shack', 'MALE_HALL', 1300),
    ('Smoothie Shack', 'MALE_MEDICAL_HALL', 1200),
    ('Smoothie Shack', 'FEMALE_HALL_1_4', 1200),
    ('Smoothie Shack', 'FEMALE_HALL_5A_5D', 1500),
    ('Smoothie Shack', 'FEMALE_MEDICAL_HALL', 1700),
    -- MEDICAL CAFETERIA
    ('Medical Cafeteria', 'MALE_HALL', 1700),
    ('Medical Cafeteria', 'MALE_MEDICAL_HALL', 800),
    ('Medical Cafeteria', 'FEMALE_HALL_1_4', 1500),
    ('Medical Cafeteria', 'FEMALE_HALL_5A_5D', 1800),
    ('Medical Cafeteria', 'FEMALE_MEDICAL_HALL', 1000),
    -- SEASONS DELI
    ('Seasons Deli', 'MALE_HALL', 1700),
    ('Seasons Deli', 'MALE_MEDICAL_HALL', 800),
    ('Seasons Deli', 'FEMALE_HALL_1_4', 1500),
    ('Seasons Deli', 'FEMALE_HALL_5A_5D', 1800),
    ('Seasons Deli', 'FEMALE_MEDICAL_HALL', 1000)
) AS p(cafeteria_name, group_name, price)
ON c.name = p.cafeteria_name AND g.name = p.group_name
WHERE p.price IS NOT NULL
ON CONFLICT (cafeteria_id, hostel_group_id) DO UPDATE SET price = EXCLUDED.price;

-- ============================================
-- VERIFY
-- ============================================
SELECT '=== SETUP COMPLETE ===' AS status;

SELECT 'Cafeterias:' AS table_name, COUNT(*) AS count FROM cafeterias WHERE is_active = true
UNION ALL
SELECT 'Hostel Groups:', COUNT(*) FROM hostel_groups WHERE is_active = true
UNION ALL
SELECT 'Pricing Entries:', COUNT(*) FROM delivery_pricing WHERE is_active = true;

-- Show pricing
SELECT c.name AS cafeteria, g.display_name AS hostel_group, dp.price
FROM delivery_pricing dp
JOIN cafeterias c ON dp.cafeteria_id = c.id
JOIN hostel_groups g ON dp.hostel_group_id = g.id
WHERE dp.is_active = true
ORDER BY c.name, g.display_name;
