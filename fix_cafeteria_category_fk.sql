-- Fix for cafeteria category issues
-- Issue 1: menu_items.category_id FK references vendor_categories but cafeterias use cafeteria_categories
-- Issue 2: RLS policy issues with cafeteria_categories causing 406 errors

-- ============================================
-- Fix 1: Drop the problematic FK constraint entirely
-- The category_id field will still work with text category names
-- ============================================
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- ============================================
-- Fix 2: Add RLS policies for cafeteria_categories
-- ============================================

-- Enable RLS if not already
ALTER TABLE cafeteria_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Cafeteria owners can manage their own categories
DROP POLICY IF EXISTS "Cafeterias can manage own categories" ON cafeteria_categories;
CREATE POLICY "Cafeterias can manage own categories"
  ON cafeteria_categories
  FOR ALL
  USING (
    cafeteria_id IN (
      SELECT id FROM cafeterias 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow read access for customers viewing cafeteria menus
DROP POLICY IF EXISTS "Anyone can view active cafeteria categories" ON cafeteria_categories;
CREATE POLICY "Anyone can view active cafeteria categories"
  ON cafeteria_categories
  FOR SELECT
  USING (is_active = true);

-- ============================================
-- Fix 3: Also add RLS policies for vendor_categories
-- ============================================

-- Enable RLS if not already
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Vendors can manage their own categories
DROP POLICY IF EXISTS "Vendors can manage own categories" ON vendor_categories;
CREATE POLICY "Vendors can manage own categories"
  ON vendor_categories
  FOR ALL
  USING (
    vendor_id IN (
      SELECT id FROM vendors 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow read access for customers viewing vendor menus
DROP POLICY IF EXISTS "Anyone can view active vendor categories" ON vendor_categories;
CREATE POLICY "Anyone can view active vendor categories"
  ON vendor_categories
  FOR SELECT
  USING (is_active = true);

-- ============================================
-- Verification
-- ============================================
-- Check current RLS policies on both tables
-- SELECT tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('cafeteria_categories', 'vendor_categories');
