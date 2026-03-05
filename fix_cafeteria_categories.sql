-- ============================================================================
-- Fix: Create cafeteria_categories table and fix category_id for cafeterias
-- ============================================================================

-- 1. Create cafeteria_categories table (similar to vendor_categories but for cafeterias)
CREATE TABLE IF NOT EXISTS cafeteria_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cafeteria_id UUID NOT NULL REFERENCES cafeterias(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category_type TEXT DEFAULT 'food',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cafeteria_id, name)
);

-- Enable RLS
ALTER TABLE cafeteria_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Cafeterias can view own categories" ON cafeteria_categories;
DROP POLICY IF EXISTS "Cafeterias can insert own categories" ON cafeteria_categories;
DROP POLICY IF EXISTS "Cafeterias can update own categories" ON cafeteria_categories;
DROP POLICY IF EXISTS "Cafeterias can delete own categories" ON cafeteria_categories;

-- Policy: Cafeterias can only view their own categories
CREATE POLICY "Cafeterias can view own categories" ON cafeteria_categories
    FOR SELECT
    USING (cafeteria_id IN (SELECT id FROM cafeterias WHERE cafeterias.user_id = auth.uid()));

-- Policy: Cafeterias can insert their own categories
CREATE POLICY "Cafeterias can insert own categories" ON cafeteria_categories
    FOR INSERT
    WITH CHECK (cafeteria_id IN (SELECT id FROM cafeterias WHERE cafeterias.user_id = auth.uid()));

-- Policy: Cafeterias can update their own categories
CREATE POLICY "Cafeterias can update own categories" ON cafeteria_categories
    FOR UPDATE
    USING (cafeteria_id IN (SELECT id FROM cafeterias WHERE cafeterias.user_id = auth.uid()));

-- Policy: Cafeterias can delete their own categories
CREATE POLICY "Cafeterias can delete own categories" ON cafeteria_categories
    FOR DELETE
    USING (cafeteria_id IN (SELECT id FROM cafeterias WHERE cafeterias.user_id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cafeteria_categories_cafeteria_id ON cafeteria_categories(cafeteria_id);

-- Grant permissions
GRANT ALL ON cafeteria_categories TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Add default food categories for existing cafeterias (if they don't have categories yet)
-- This will be done via a function that runs when needed

-- 3. Create function to seed cafeteria categories
CREATE OR REPLACE FUNCTION seed_cafeteria_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cafeteria RECORD;
    v_count INTEGER;
    v_category_id UUID;
BEGIN
    -- Get all cafeterias
    FOR v_cafeteria IN SELECT id FROM cafeterias LOOP
        -- Check if cafeteria already has categories
        SELECT COUNT(*) INTO v_count FROM cafeteria_categories 
        WHERE cafeteria_id = v_cafeteria.id AND is_active = true;
        
        -- If no categories, create default food categories
        IF v_count = 0 THEN
            INSERT INTO cafeteria_categories (cafeteria_id, name, category_type, sort_order, is_active)
            VALUES
                (v_cafeteria.id, 'Breakfast', 'food', 1, true),
                (v_cafeteria.id, 'Lunch', 'food', 2, true),
                (v_cafeteria.id, 'Dinner', 'food', 3, true),
                (v_cafeteria.id, 'Snacks', 'food', 4, true),
                (v_cafeteria.id, 'Drinks', 'food', 5, true),
                (v_cafeteria.id, 'Desserts', 'food', 6, true),
                (v_cafeteria.id, 'Other', 'general', 7, true)
            ON CONFLICT (cafeteria_id, name) DO NOTHING;
        END IF;
    END LOOP;
END;
$$;

-- Run the function to seed existing cafeterias
SELECT seed_cafeteria_categories();

-- 4. Fix: Make category_id in menu_items nullable and not require UUID for cafeteria items
-- The category_id column should allow text values for cafeterias or be nullable
-- Since the column already exists with FK to vendor_categories, we need to handle this carefully

-- Option: Allow category_id to be nullable and handle it in the application
-- The fix is already done in the database schema (category_id is nullable)

-- 5. Grant permission to anon/authenticated roles for reading cafeteria_categories
GRANT SELECT ON cafeteria_categories TO authenticated, anon;

-- 6. Create trigger to auto-create categories for new cafeterias
CREATE OR REPLACE FUNCTION create_default_cafeteria_categories()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO cafeteria_categories (cafeteria_id, name, category_type, sort_order, is_active)
    VALUES
        (NEW.id, 'Breakfast', 'food', 1, true),
        (NEW.id, 'Lunch', 'food', 2, true),
        (NEW.id, 'Dinner', 'food', 3, true),
        (NEW.id, 'Snacks', 'food', 4, true),
        (NEW.id, 'Drinks', 'food', 5, true),
        (NEW.id, 'Desserts', 'food', 6, true),
        (NEW.id, 'Other', 'general', 7, true)
    ON CONFLICT (cafeteria_id, name) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_cafeteria_categories ON cafeterias;
CREATE TRIGGER trigger_create_cafeteria_categories
    AFTER INSERT ON cafeterias
    FOR EACH ROW
    EXECUTE FUNCTION create_default_cafeteria_categories();

-- 7. Clean up any invalid category_id values in menu_items for cafeterias
-- Fix items where category_id is not a valid UUID (like "other" string)
UPDATE menu_items
SET category_id = NULL
WHERE seller_type = 'cafeteria'
AND category_id IS NOT NULL
AND category_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}
;

-- Summary
SELECT 'Cafeteria categories table created and seeded successfully!' as status;
