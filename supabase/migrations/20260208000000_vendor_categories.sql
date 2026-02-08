-- Migration: Vendor Categories Support
-- Allows vendors to create and manage their own product/food categories

-- Add missing columns to existing vendor_categories table
ALTER TABLE vendor_categories ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'general';
ALTER TABLE vendor_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vendor_categories_vendor_id 
ON vendor_categories(vendor_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vendor_categories_sort 
ON vendor_categories(vendor_id, sort_order) WHERE is_active = true;

-- Seed default categories for EXISTING vendors that don't have categories yet
DO $$
DECLARE
    v_vendor RECORD;
    v_count INTEGER;
BEGIN
    FOR v_vendor IN SELECT * FROM vendors LOOP
        -- Check if vendor has any categories
        SELECT COUNT(*) INTO v_count FROM vendor_categories WHERE vendor_id = v_vendor.id AND is_active = true;
        
        -- If no categories, seed them
        IF v_count = 0 THEN
            IF v_vendor.vendor_type = 'student' THEN
                INSERT INTO vendor_categories (vendor_id, name, category_type, sort_order)
                VALUES 
                    (v_vendor.id, 'Main Course', 'food', 1),
                    (v_vendor.id, 'Swallow', 'food', 2),
                    (v_vendor.id, 'Protein', 'food', 3),
                    (v_vendor.id, 'Drink', 'food', 4),
                    (v_vendor.id, 'Snack', 'food', 5),
                    (v_vendor.id, 'Salad', 'food', 6),
                    (v_vendor.id, 'Pizza', 'food', 7),
                    (v_vendor.id, 'Side', 'food', 8),
                    (v_vendor.id, 'Soup', 'food', 9);
            ELSIF v_vendor.vendor_type = 'late_night' THEN
                INSERT INTO vendor_categories (vendor_id, name, category_type, sort_order)
                VALUES 
                    (v_vendor.id, 'Electronics', 'product', 1),
                    (v_vendor.id, 'Books', 'product', 2),
                    (v_vendor.id, 'Clothing', 'product', 3),
                    (v_vendor.id, 'Services', 'service', 4),
                    (v_vendor.id, 'Stationery', 'product', 5),
                    (v_vendor.id, 'Beauty', 'product', 6),
                    (v_vendor.id, 'Sports', 'product', 7),
                    (v_vendor.id, 'Other', 'general', 8);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Create function to seed categories for NEW vendors
CREATE OR REPLACE FUNCTION seed_default_categories_for_new_vendor()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check if vendor already has categories
    SELECT COUNT(*) INTO v_count FROM vendor_categories WHERE vendor_id = NEW.id AND is_active = true;
    
    IF v_count = 0 THEN
        -- Student vendors (food) get food categories
        IF NEW.vendor_type = 'student' THEN
            INSERT INTO vendor_categories (vendor_id, name, category_type, sort_order)
            VALUES 
                (NEW.id, 'Main Course', 'food', 1),
                (NEW.id, 'Swallow', 'food', 2),
                (NEW.id, 'Protein', 'food', 3),
                (NEW.id, 'Drink', 'food', 4),
                (NEW.id, 'Snack', 'food', 5),
                (NEW.id, 'Salad', 'food', 6),
                (NEW.id, 'Pizza', 'food', 7),
                (NEW.id, 'Side', 'food', 8),
                (NEW.id, 'Soup', 'food', 9);
        -- Late night vendors (business) get product categories
        ELSIF NEW.vendor_type = 'late_night' THEN
            INSERT INTO vendor_categories (vendor_id, name, category_type, sort_order)
            VALUES 
                (NEW.id, 'Electronics', 'product', 1),
                (NEW.id, 'Books', 'product', 2),
                (NEW.id, 'Clothing', 'product', 3),
                (NEW.id, 'Services', 'service', 4),
                (NEW.id, 'Stationery', 'product', 5),
                (NEW.id, 'Beauty', 'product', 6),
                (NEW.id, 'Sports', 'product', 7),
                (NEW.id, 'Other', 'general', 8);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_seed_default_categories ON vendors;

-- Create trigger to auto-seed categories when new vendor is created
CREATE TRIGGER trigger_seed_default_categories
    AFTER INSERT ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION seed_default_categories_for_new_vendor();

-- Update updated_at timestamp on category update
CREATE OR REPLACE FUNCTION update_vendor_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_category_timestamp ON vendor_categories;
CREATE TRIGGER trigger_update_category_timestamp
    BEFORE UPDATE ON vendor_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_category_timestamp();

-- Add foreign key to menu_items (optional - allows linking to categories)
-- Only add if column doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'menu_items' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE menu_items ADD COLUMN category_id UUID REFERENCES vendor_categories(id) ON DELETE SET NULL;
    END IF;
END $$;
