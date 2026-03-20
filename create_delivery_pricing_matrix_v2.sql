-- ============================================
-- DELIVERY PRICING MATRIX - IMPROVED VERSION
-- With Better RLS, Triggers, and Price History
-- ============================================

-- ============================================
-- 0. CHECK IF CAFETERIAS TABLE EXISTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cafeterias') THEN
        RAISE NOTICE 'Creating cafeterias table...';
        CREATE TABLE cafeterias (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id),
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        RAISE NOTICE 'Cafeterias table already exists.';
    END IF;
END $$;

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
-- 2. HOSTELS TABLE
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
-- 3. DELIVERY PRICING TABLE (with price history)
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
    UNIQUE(cafeteria_id, hostel_group_id, effective_from)
);

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_delivery_pricing_cafeteria ON delivery_pricing(cafeteria_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pricing_hostel_group ON delivery_pricing(hostel_group_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pricing_active ON delivery_pricing(cafeteria_id, hostel_group_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_hostels_group ON hostels(group_id);
CREATE INDEX IF NOT EXISTS idx_hostels_name ON hostels(name);

-- ============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach triggers
DROP TRIGGER IF EXISTS update_hostel_groups_updated_at ON hostel_groups;
CREATE TRIGGER update_hostel_groups_updated_at
    BEFORE UPDATE ON hostel_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hostels_updated_at ON hostels;
CREATE TRIGGER update_hostels_updated_at
    BEFORE UPDATE ON hostels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_pricing_updated_at ON delivery_pricing;
CREATE TRIGGER update_delivery_pricing_updated_at
    BEFORE UPDATE ON delivery_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. RLS POLICIES (Improved)
-- ============================================
ALTER TABLE hostel_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_pricing ENABLE ROW LEVEL SECURITY;

-- HOSTEL GROUPS
CREATE POLICY "Anyone can view hostel groups" 
    ON hostel_groups FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admin can manage hostel groups" 
    ON hostel_groups FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- HOSTELS
CREATE POLICY "Anyone can view hostels" 
    ON hostels FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admin can manage hostels" 
    ON hostels FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- DELIVERY PRICING
CREATE POLICY "Anyone can view delivery pricing" 
    ON delivery_pricing FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admin can manage delivery pricing" 
    ON delivery_pricing FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 7. SEED DATA - HOSTEL GROUPS
-- ============================================
INSERT INTO hostel_groups (name, display_name, description) VALUES
    ('MALE_HALL', 'Male Hall', 'Male Halls 1-6 - Main male hostel blocks'),
    ('MALE_MEDICAL_HALL', 'Male Medical Hall', 'Male Medical Hall - Medical school male hostel'),
    ('FEMALE_HALL_1_4', 'Female Hall 1-4', 'Female Halls 1-4 - Main female hostel blocks'),
    ('FEMALE_HALL_5A_5D', 'Female Hall 5A-5D', 'Female Halls 5A-5D - Extended female hostel blocks'),
    ('FEMALE_MEDICAL_HALL', 'Female Medical Hall', 'Female Medical Halls 1-4 - Medical school female hostels')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. SEED DATA - HOSTELS
-- ============================================
INSERT INTO hostels (name, display_name, group_id) 
SELECT 
    h.name,
    h.display_name,
    g.id
FROM (VALUES
    ('MALE_HALL_1', 'Male Hall 1'),
    ('MALE_HALL_2', 'Male Hall 2'),
    ('MALE_HALL_3', 'Male Hall 3'),
    ('MALE_HALL_4', 'Male Hall 4'),
    ('MALE_HALL_5', 'Male Hall 5'),
    ('MALE_HALL_6', 'Male Hall 6'),
    ('MALE_MEDICAL_HALL', 'Male Medical Hall'),
    ('FEMALE_HALL_1', 'Female Hall 1'),
    ('FEMALE_HALL_2', 'Female Hall 2'),
    ('FEMALE_HALL_3', 'Female Hall 3'),
    ('FEMALE_HALL_4', 'Female Hall 4'),
    ('FEMALE_HALL_5A', 'Female Hall 5A'),
    ('FEMALE_HALL_5B', 'Female Hall 5B'),
    ('FEMALE_HALL_5C', 'Female Hall 5C'),
    ('FEMALE_HALL_5D', 'Female Hall 5D'),
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
-- 9. SEED DATA - DELIVERY PRICING (YOUR EXACT PRICES)
-- ============================================
INSERT INTO delivery_pricing (cafeteria_id, hostel_group_id, price)
SELECT 
    c.id AS cafeteria_id,
    g.id AS hostel_group_id,
    p.price
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
ON CONFLICT (cafeteria_id, hostel_group_id, effective_from) DO UPDATE SET
    price = EXCLUDED.price,
    updated_at = NOW();

-- ============================================
-- 10. RPC FUNCTIONS
-- ============================================

-- Get delivery fee by cafeteria and hostel
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
    -- Get the hostel group
    SELECT h.group_id INTO v_group_id
    FROM hostels h
    WHERE h.name = p_hostel_name OR h.display_name = p_hostel_name
    LIMIT 1;

    -- Try legacy mapping if not found
    IF v_group_id IS NULL THEN
        SELECT g.id INTO v_group_id
        FROM hostel_groups g
        WHERE 
            (p_hostel_name LIKE 'Male Hostel%' AND g.name = 'MALE_HALL')
            OR (p_hostel_name LIKE 'Medical Male Hostel%' AND g.name = 'MALE_MEDICAL_HALL')
            OR (p_hostel_name LIKE 'Female Medical Hostel%' AND g.name = 'FEMALE_MEDICAL_HALL')
            OR (p_hostel_name LIKE 'New Female Hostel%' AND g.name = 'FEMALE_HALL_1_4')
        LIMIT 1;
    END IF;

    -- Get the active price
    IF v_group_id IS NOT NULL THEN
        SELECT dp.price INTO v_price
        FROM delivery_pricing dp
        WHERE dp.cafeteria_id = p_cafeteria_id
            AND dp.hostel_group_id = v_group_id
            AND dp.is_active = true
            AND dp.effective_from <= NOW()
            AND (dp.effective_to IS NULL OR dp.effective_to > NOW())
        ORDER BY dp.effective_from DESC
        LIMIT 1;
    END IF;

    -- Return price or default
    RETURN COALESCE(v_price, 1500); -- Default to ₦1500
END;
$$;

-- Get all prices for a cafeteria
CREATE OR REPLACE FUNCTION get_cafeteria_delivery_prices(
    p_cafeteria_id UUID
)
RETURNS TABLE(
    hostel_group_name TEXT,
    hostel_group_display_name TEXT,
    price INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.name AS hostel_group_name,
        g.display_name AS hostel_group_display_name,
        dp.price
    FROM delivery_pricing dp
    JOIN hostel_groups g ON dp.hostel_group_id = g.id
    WHERE dp.cafeteria_id = p_cafeteria_id
        AND dp.is_active = true
        AND dp.effective_from <= NOW()
        AND (dp.effective_to IS NULL OR dp.effective_to > NOW())
    ORDER BY g.display_name;
END;
$$;

-- Update delivery price (with history)
CREATE OR REPLACE FUNCTION update_delivery_price(
    p_cafeteria_id UUID,
    p_hostel_group_name TEXT,
    p_new_price INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hostel_group_id UUID;
    v_existing_id UUID;
BEGIN
    -- Get hostel group ID
    SELECT id INTO v_hostel_group_id
    FROM hostel_groups
    WHERE name = p_hostel_group_name;

    IF v_hostel_group_id IS NULL THEN
        RAISE EXCEPTION 'Invalid hostel group: %', p_hostel_group_name;
    END IF;

    -- Find existing active price
    SELECT id INTO v_existing_id
    FROM delivery_pricing
    WHERE cafeteria_id = p_cafeteria_id
        AND hostel_group_id = v_hostel_group_id
        AND is_active = true
        AND effective_from <= NOW()
        AND (effective_to IS NULL OR effective_to > NOW())
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Deactivate old price
        UPDATE delivery_pricing 
        SET is_active = false, effective_to = NOW()
        WHERE id = v_existing_id;
    END IF;

    -- Insert new price
    INSERT INTO delivery_pricing (
        cafeteria_id, 
        hostel_group_id, 
        price, 
        is_active, 
        effective_from
    ) VALUES (
        p_cafeteria_id,
        v_hostel_group_id,
        p_new_price,
        true,
        NOW()
    );

    RETURN true;
END;
$$;

-- ============================================
-- 11. VERIFY SETUP
-- ============================================
SELECT 'Hostel Groups' AS table_name, COUNT(*) AS count FROM hostel_groups
UNION ALL
SELECT 'Hostels', COUNT(*) FROM hostels
UNION ALL
SELECT 'Delivery Pricing', COUNT(*) FROM delivery_pricing
UNION ALL
SELECT 'Active Cafeterias', COUNT(*) FROM cafeterias WHERE is_active = true;

-- List cafeteria names
SELECT name FROM cafeterias WHERE is_active = true ORDER BY name;
