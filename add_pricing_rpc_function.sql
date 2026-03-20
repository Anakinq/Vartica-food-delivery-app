-- ============================================
-- RPC FUNCTION: Get Delivery Fee
-- Query price from delivery_pricing table
-- ============================================

-- Function to get delivery fee by cafeteria name and hostel group
CREATE OR REPLACE FUNCTION get_delivery_price(
    p_cafeteria_name TEXT,
    p_hostel_group_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_price INTEGER;
BEGIN
    -- Look up the price from the matrix
    SELECT dp.price INTO v_price
    FROM delivery_pricing dp
    JOIN cafeterias c ON dp.cafeteria_id = c.id
    JOIN hostel_groups hg ON dp.hostel_group_id = hg.id
    WHERE c.name = p_cafeteria_name
      AND hg.name = p_hostel_group_name
      AND dp.is_active = true
      AND c.is_active = true
      AND hg.is_active = true
    LIMIT 1;

    -- Return price or default (1500)
    RETURN COALESCE(v_price, 1500);
END;
$$;

-- Function to get all prices for a cafeteria
CREATE OR REPLACE FUNCTION get_cafeteria_prices(
    p_cafeteria_name TEXT
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
        hg.name::TEXT AS hostel_group_name,
        hg.display_name::TEXT AS hostel_group_display_name,
        dp.price
    FROM delivery_pricing dp
    JOIN cafeterias c ON dp.cafeteria_id = c.id
    JOIN hostel_groups hg ON dp.hostel_group_id = hg.id
    WHERE c.name = p_cafeteria_name
      AND dp.is_active = true
    ORDER BY hg.display_name;
END;
$$;

-- Function to get price by hostel name (auto-detect group)
CREATE OR REPLACE FUNCTION get_delivery_price_by_hostel(
    p_cafeteria_name TEXT,
    p_hostel_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_price INTEGER;
    v_hostel_group_name TEXT;
BEGIN
    -- Map hostel name to group
    -- This uses pattern matching for the hostel name
    SELECT 
        CASE
            WHEN p_hostel_name LIKE 'Male Hall%' AND p_hostel_name NOT LIKE '%Medical%' THEN 'MALE_HALL'
            WHEN p_hostel_name LIKE 'Male Medical%' THEN 'MALE_MEDICAL_HALL'
            WHEN p_hostel_name LIKE 'Female Hall%' AND p_hostel_name NOT LIKE '%Medical%' AND p_hostel_name NOT LIKE '%5%' THEN 'FEMALE_HALL_1_4'
            WHEN p_hostel_name LIKE 'Female Hall 5%' THEN 'FEMALE_HALL_5A_5D'
            WHEN p_hostel_name LIKE 'Female Medical%' THEN 'FEMALE_MEDICAL_HALL'
            ELSE NULL
        END
    INTO v_hostel_group_name;

    -- If we couldn't map, try the other hostels table
    IF v_hostel_group_name IS NULL THEN
        SELECT 
            CASE
                WHEN h.name LIKE 'Male Hall%' AND h.name NOT LIKE '%Medical%' THEN 'MALE_HALL'
                WHEN h.name LIKE 'Male Medical%' THEN 'MALE_MEDICAL_HALL'
                WHEN h.name LIKE 'Female Hall%' AND h.name NOT LIKE '%Medical%' AND h.name NOT LIKE '%5%' THEN 'FEMALE_HALL_1_4'
                WHEN h.name LIKE 'Female Hall 5%' THEN 'FEMALE_HALL_5A_5D'
                WHEN h.name LIKE 'Female Medical%' THEN 'FEMALE_MEDICAL_HALL'
            END
        INTO v_hostel_group_name
        FROM hostels h
        WHERE h.name = p_hostel_name OR h.display_name = p_hostel_name
        LIMIT 1;
    END IF;

    -- Get the price
    IF v_hostel_group_name IS NOT NULL THEN
        SELECT dp.price INTO v_price
        FROM delivery_pricing dp
        JOIN cafeterias c ON dp.cafeteria_id = c.id
        JOIN hostel_groups hg ON dp.hostel_group_id = hg.id
        WHERE c.name = p_cafeteria_name
          AND hg.name = v_hostel_group_name
          AND dp.is_active = true
        LIMIT 1;
    END IF;

    -- Return price or default
    RETURN COALESCE(v_price, 1500);
END;
$$;

-- Test the functions
SELECT 'Testing get_delivery_price function...' AS test;

-- Test: Cafeteria 2 to Female Hall 1-4 should return 1000
SELECT 'Cafeteria 2 → Female Hall 1-4: ₦' || get_delivery_price('Cafeteria 2', 'FEMALE_HALL_1_4') AS expected_1000;

-- Test: Medical Cafeteria to Male Medical Hall should return 800
SELECT 'Medical Cafeteria → Male Medical: ₦' || get_delivery_price('Medical Cafeteria', 'MALE_MEDICAL_HALL') AS expected_800;

-- Test: Seasons Deli to Female Medical Hall should return 1000
SELECT 'Seasons Deli → Female Medical: ₦' || get_delivery_price('Seasons Deli', 'FEMALE_MEDICAL_HALL') AS expected_1000;

-- Test get all prices for a cafeteria
SELECT * FROM get_cafeteria_prices('Cafeteria 2');
