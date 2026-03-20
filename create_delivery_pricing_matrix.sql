-- ============================================
-- DELIVERY PRICING MATRIX - Database Schema
-- Cafeteria-to-Hostel Pricing System
-- 7 Cafeterias × 5 Hostel Groups = 35 Price Combinations
-- ============================================

-- ============================================
-- 1. HOSTEL GROUPS TABLE
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

-- ============================================
-- 2. HOSTELS TABLE (with group association)
-- ============================================
CREATE TABLE IF NOT EXISTS hostels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    group_id UUID REFERENCES hostel_groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. DELIVERY PRICING MATRIX TABLE
-- Stores cafeteria-to-hostel delivery fees
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafeteria_id UUID NOT NULL REFERENCES cafeterias(id) ON DELETE CASCADE,
    hostel_group_id UUID NOT NULL REFERENCES hostel_groups(id) ON DELETE CASCADE,
    price INTEGER NOT NULL CHECK (price >= 0), -- Delivery fee in Naira
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cafeteria_id, hostel_group_id)
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_pricing_cafeteria 
    ON delivery_pricing(cafeteria_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pricing_hostel_group 
    ON delivery_pricing(hostel_group_id);
CREATE INDEX IF NOT EXISTS idx_hostels_group 
    ON hostels(group_id);
CREATE INDEX IF NOT EXISTS idx_hostels_name 
    ON hostels(name);

-- ============================================
-- 5. RLS POLICIES
-- ============================================
ALTER TABLE hostel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_pricing ENABLE ROW LEVEL SECURITY;

-- Everyone can read hostel groups and hostels
CREATE POLICY "Hostel groups are viewable by everyone" 
    ON hostel_groups FOR SELECT USING (true);
CREATE POLICY "Hostels are viewable by everyone" 
    ON hostels FOR SELECT USING (true);
CREATE POLICY "Delivery pricing is viewable by everyone" 
    ON delivery_pricing FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admin can manage hostel groups" 
    ON hostel_groups FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Admin can manage hostels" 
    ON hostels FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Admin can manage delivery pricing" 
    ON delivery_pricing FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- 6. SEED DATA - HOSTEL GROUPS
-- ============================================
INSERT INTO hostel_groups (name, display_name, description) VALUES
    ('MALE_HALL', 'Male Hall', 'Male Halls 1-6 - Main male hostel blocks'),
    ('MALE_MEDICAL_HALL', 'Male Medical Hall', 'Male Medical Hall - Medical school male hostel'),
    ('FEMALE_HALL_1_4', 'Female Hall 1-4', 'Female Halls 1-4 - Main female hostel blocks'),
    ('FEMALE_HALL_5A_5D', 'Female Hall 5A-5D', 'Female Halls 5A-5D - Extended female hostel blocks'),
    ('FEMALE_MEDICAL_HALL', 'Female Medical Hall', 'Female Medical Halls 1-4 - Medical school female hostels')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. SEED DATA - HOSTELS (with new naming)
-- ============================================
INSERT INTO hostels (name, display_name, group_id) 
SELECT 
    h.name,
    h.display_name,
    g.id
FROM (
    VALUES
        -- Male Halls 1-6
        ('MALE_HALL_1', 'Male Hall 1'),
        ('MALE_HALL_2', 'Male Hall 2'),
        ('MALE_HALL_3', 'Male Hall 3'),
        ('MALE_HALL_4', 'Male Hall 4'),
        ('MALE_HALL_5', 'Male Hall 5'),
        ('MALE_HALL_6', 'Male Hall 6'),
        -- Male Medical Hall
        ('MALE_MEDICAL_HALL', 'Male Medical Hall'),
        -- Female Halls 1-4
        ('FEMALE_HALL_1', 'Female Hall 1'),
        ('FEMALE_HALL_2', 'Female Hall 2'),
        ('FEMALE_HALL_3', 'Female Hall 3'),
        ('FEMALE_HALL_4', 'Female Hall 4'),
        -- Female Halls 5A-5D
        ('FEMALE_HALL_5A', 'Female Hall 5A'),
        ('FEMALE_HALL_5B', 'Female Hall 5B'),
        ('FEMALE_HALL_5C', 'Female Hall 5C'),
        ('FEMALE_HALL_5D', 'Female Hall 5D'),
        -- Female Medical Halls
        ('FEMALE_MEDICAL_HALL_1', 'Female Medical Hall 1'),
        ('FEMALE_MEDICAL_HALL_2', 'Female Medical Hall 2'),
        ('FEMALE_MEDICAL_HALL_3', 'Female Medical Hall 3'),
        ('FEMALE_MEDICAL_HALL_4', 'Female Medical Hall 4')
) AS h(name, display_name)
CROSS JOIN LATERAL (
    SELECT id FROM hostel_groups WHERE name = 
        CASE
            WHEN h.name LIKE 'MALE_HALL_%' AND h.name != 'MALE_MEDICAL_HALL' THEN 'MALE_HALL'
            WHEN h.name = 'MALE_MEDICAL_HALL' THEN 'MALE_MEDICAL_HALL'
            WHEN h.name LIKE 'FEMALE_HALL_%' AND h.name NOT LIKE 'FEMALE_HALL_5%' THEN 'FEMALE_HALL_1_4'
            WHEN h.name LIKE 'FEMALE_HALL_5%' THEN 'FEMALE_HALL_5A_5D'
            WHEN h.name LIKE 'FEMALE_MEDICAL_HALL_%' THEN 'FEMALE_MEDICAL_HALL'
        END
) g
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. SEED DATA - DELIVERY PRICING MATRIX
-- 7 Cafeterias × 5 Hostel Groups = 35 combinations
-- ============================================
-- ============================================
-- PRICING DATA - USER PROVIDED EXACT PRICES
-- 7 Cafeterias × 5 Hostel Groups = 35 combinations
-- ============================================
INSERT INTO delivery_pricing (cafeteria_id, hostel_group_id, price)
SELECT 
    c.id AS cafeteria_id,
    g.id AS hostel_group_id,
    p.price
FROM cafeterias c
CROSS JOIN hostel_groups g
LEFT JOIN (
    VALUES
        -- ============================================
        -- CAFETERIA 1 PRICING (User Provided)
        -- ============================================
        ('Cafeteria 1', 'MALE_HALL', 1300),
        ('Cafeteria 1', 'MALE_MEDICAL_HALL', 1200),
        ('Cafeteria 1', 'FEMALE_HALL_1_4', 1200),
        ('Cafeteria 1', 'FEMALE_HALL_5A_5D', 1500),
        ('Cafeteria 1', 'FEMALE_MEDICAL_HALL', 1700),
        -- ============================================
        -- CAFETERIA 2 PRICING (BASE - User Provided)
        -- ============================================
        ('Cafeteria 2', 'MALE_HALL', 1500),
        ('Cafeteria 2', 'MALE_MEDICAL_HALL', 2000),
        ('Cafeteria 2', 'FEMALE_HALL_1_4', 1000),
        ('Cafeteria 2', 'FEMALE_HALL_5A_5D', 1300),
        ('Cafeteria 2', 'FEMALE_MEDICAL_HALL', 2000),
        -- ============================================
        -- CAFETERIA 3 PRICING (User Provided)
        -- ============================================
        ('Cafeteria 3', 'MALE_HALL', 1300),
        ('Cafeteria 3', 'MALE_MEDICAL_HALL', 1200),
        ('Cafeteria 3', 'FEMALE_HALL_1_4', 1200),
        ('Cafeteria 3', 'FEMALE_HALL_5A_5D', 1700),
        ('Cafeteria 3', 'FEMALE_MEDICAL_HALL', 1700),
        -- ============================================
        -- CAPTAIN COOK PRICING (User Provided)
        -- ============================================
        ('Captain Cook', 'MALE_HALL', 1300),
        ('Captain Cook', 'MALE_MEDICAL_HALL', 1200),
        ('Captain Cook', 'FEMALE_HALL_1_4', 1200),
        ('Captain Cook', 'FEMALE_HALL_5A_5D', 1500),
        ('Captain Cook', 'FEMALE_MEDICAL_HALL', 1700),
        -- ============================================
        -- SMOOTHIE SHACK PRICING (User Provided)
        -- ============================================
        ('Smoothie Shack', 'MALE_HALL', 1300),
        ('Smoothie Shack', 'MALE_MEDICAL_HALL', 1200),
        ('Smoothie Shack', 'FEMALE_HALL_1_4', 1200),
        ('Smoothie Shack', 'FEMALE_HALL_5A_5D', 1500),
        ('Smoothie Shack', 'FEMALE_MEDICAL_HALL', 1700),
        -- ============================================
        -- MEDICAL CAFETERIA PRICING (User Provided)
        -- ============================================
        ('Medical Cafeteria', 'MALE_HALL', 1700),
        ('Medical Cafeteria', 'MALE_MEDICAL_HALL', 800),
        ('Medical Cafeteria', 'FEMALE_HALL_1_4', 1500),
        ('Medical Cafeteria', 'FEMALE_HALL_5A_5D', 1800),
        ('Medical Cafeteria', 'FEMALE_MEDICAL_HALL', 1000),
        -- ============================================
        -- SEASONS DELI PRICING (User Provided)
        -- ============================================
        ('Seasons Deli', 'MALE_HALL', 1700),
        ('Seasons Deli', 'MALE_MEDICAL_HALL', 800),
        ('Seasons Deli', 'FEMALE_HALL_1_4', 1500),
        ('Seasons Deli', 'FEMALE_HALL_5A_5D', 1800),
        ('Seasons Deli', 'FEMALE_MEDICAL_HALL', 1000)
) AS p(cafeteria_name, group_name, price)
ON c.name = p.cafeteria_name AND g.name = p.group_name
WHERE p.price IS NOT NULL
ON CONFLICT (cafeteria_id, hostel_group_id) DO UPDATE SET
    price = EXCLUDED.price,
    updated_at = NOW();

-- ============================================
-- 9. RPC FUNCTION - Get delivery fee by cafeteria and hostel
-- ============================================
CREATE OR REPLACE FUNCTION get_delivery_fee(
    p_cafeteria_id UUID,
    p_hostel_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_price INTEGER;
    v_group_id UUID;
BEGIN
    -- Get the hostel group for the given hostel name
    SELECT h.group_id INTO v_group_id
    FROM hostels h
    WHERE h.name = p_hostel_name OR h.display_name = p_hostel_name
    LIMIT 1;

    -- If no hostel found, try to get from legacy hostel mapping
    IF v_group_id IS NULL THEN
        -- Try to map legacy hostel names to groups
        SELECT g.id INTO v_group_id
        FROM hostel_groups g
        WHERE 
            (p_hostel_name LIKE 'Male Hostel%' AND g.name = 'MALE_HALL')
            OR (p_hostel_name LIKE 'Medical Male Hostel%' AND g.name = 'MALE_MEDICAL_HALL')
            OR (p_hostel_name LIKE 'Female Medical Hostel%' AND g.name = 'FEMALE_MEDICAL_HALL')
            OR (p_hostel_name LIKE 'New Female Hostel%' AND g.name = 'FEMALE_HALL_1_4')
        LIMIT 1;
    END IF;

    -- Get the price from the matrix
    IF v_group_id IS NOT NULL THEN
        SELECT dp.price INTO v_price
        FROM delivery_pricing dp
        WHERE dp.cafeteria_id = p_cafeteria_id
            AND dp.hostel_group_id = v_group_id
            AND dp.is_active = true
            AND (dp.effective_to IS NULL OR dp.effective_to > NOW())
        LIMIT 1;
    END IF;

    -- Return price or default
    RETURN COALESCE(v_price, 500); -- Default to 500 Naira
END;
$$;

-- ============================================
-- 10. RPC FUNCTION - Get all prices for a cafeteria
-- ============================================
CREATE OR REPLACE FUNCTION get_cafeteria_delivery_prices(
    p_cafeteria_id UUID
)
RETURNS TABLE (
    group_name VARCHAR(100),
    group_display_name VARCHAR(100),
    price INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.name AS group_name,
        g.display_name AS group_display_name,
        COALESCE(dp.price, 500) AS price
    FROM hostel_groups g
    LEFT JOIN delivery_pricing dp ON 
        dp.hostel_group_id = g.id 
        AND dp.cafeteria_id = p_cafeteria_id
        AND dp.is_active = true
        AND (dp.effective_to IS NULL OR dp.effective_to > NOW())
    WHERE g.is_active = true
    ORDER BY g.display_name;
END;
$$;

-- ============================================
-- 11. RPC FUNCTION - Update delivery price (admin)
-- ============================================
CREATE OR REPLACE FUNCTION update_delivery_price(
    p_cafeteria_id UUID,
    p_hostel_group_name VARCHAR(100),
    p_price INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hostel_group_id UUID;
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can update delivery prices';
    END IF;

    -- Get hostel group ID
    SELECT id INTO v_hostel_group_id
    FROM hostel_groups
    WHERE name = p_hostel_group_name;

    IF v_hostel_group_id IS NULL THEN
        RAISE EXCEPTION 'Hostel group not found: %', p_hostel_group_name;
    END IF;

    -- Insert or update the price
    INSERT INTO delivery_pricing (cafeteria_id, hostel_group_id, price)
    VALUES (p_cafeteria_id, v_hostel_group_id, p_price)
    ON CONFLICT (cafeteria_id, hostel_group_id) 
    DO UPDATE SET price = p_price, updated_at = NOW();

    RETURN TRUE;
END;
$$;

-- ============================================
-- 12. Add legacy hostel names mapping
-- ============================================
INSERT INTO hostels (name, display_name, group_id, is_active) 
SELECT 
    h.legacy_name,
    h.legacy_display,
    g.id,
    false -- Mark legacy as inactive but keep for reference
FROM (
    VALUES
        ('Male Hostel 1', 'Male Hostel 1', 'MALE_HALL'),
        ('Male Hostel 2', 'Male Hostel 2', 'MALE_HALL'),
        ('Male Hostel 3', 'Male Hostel 3', 'MALE_HALL'),
        ('Male Hostel 4', 'Male Hostel 4', 'MALE_HALL'),
        ('Male Hostel 5', 'Male Hostel 5', 'MALE_HALL'),
        ('Male Hostel 6', 'Male Hostel 6', 'MALE_HALL'),
        ('Medical Male Hostel 1', 'Medical Male Hostel 1', 'MALE_MEDICAL_HALL'),
        ('Medical Male Hostel 2', 'Medical Male Hostel 2', 'MALE_MEDICAL_HALL'),
        ('Female Medical Hostel 1', 'Female Medical Hostel 1', 'FEMALE_MEDICAL_HALL'),
        ('Female Medical Hostel 2', 'Female Medical Hostel 2', 'FEMALE_MEDICAL_HALL'),
        ('Female Medical Hostel 3', 'Female Medical Hostel 3', 'FEMALE_MEDICAL_HALL'),
        ('Female Medical Hostel 4', 'Female Medical Hostel 4', 'FEMALE_MEDICAL_HALL'),
        ('Female Medical Hostel 5', 'Female Medical Hostel 5', 'FEMALE_MEDICAL_HALL'),
        ('Female Medical Hostel 6', 'Female Medical Hostel 6', 'FEMALE_MEDICAL_HALL'),
        ('New Female Hostel 1', 'New Female Hostel 1', 'FEMALE_HALL_1_4'),
        ('New Female Hostel 2', 'New Female Hostel 2', 'FEMALE_HALL_1_4'),
        ('Abuad Hostel', 'Abuad Hostel', 'MALE_HALL'),
        ('Wema Hostel', 'Wema Hostel', 'MALE_HALL')
) AS h(legacy_name, legacy_display, group_name)
CROSS JOIN hostel_groups g
WHERE g.name = h.group_name
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 13. Comments for documentation
-- ============================================
COMMENT ON TABLE hostel_groups IS 'Groups hostels by category (Male Hall, Female Hall, Medical, etc.)';
COMMENT ON TABLE hostels IS 'Individual hostels with group associations';
COMMENT ON TABLE delivery_pricing IS 'Delivery fee matrix: cafeteria × hostel group = price';
COMMENT ON FUNCTION get_delivery_fee IS 'Get delivery fee for a specific cafeteria and hostel';
COMMENT ON FUNCTION get_cafeteria_delivery_prices IS 'Get all delivery prices for a cafeteria';
COMMENT ON FUNCTION update_delivery_price IS 'Update delivery price (admin only)';

-- ============================================
-- Verification Query
-- ============================================
SELECT 
    c.name AS cafeteria,
    hg.display_name AS hostel_group,
    dp.price
FROM delivery_pricing dp
JOIN cafeterias c ON c.id = dp.cafeteria_id
JOIN hostel_groups hg ON hg.id = dp.hostel_group_id
WHERE dp.is_active = true
ORDER BY c.name, hg.display_name;
