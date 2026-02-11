-- Create vendor_categories table for storing vendor-specific categories
CREATE TABLE IF NOT EXISTS vendor_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendor_id, name)
);

-- Enable RLS for vendor_categories
ALTER TABLE vendor_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors can view own categories" ON vendor_categories;
DROP POLICY IF EXISTS "Vendors can insert own categories" ON vendor_categories;
DROP POLICY IF EXISTS "Vendors can update own categories" ON vendor_categories;
DROP POLICY IF EXISTS "Vendors can delete own categories" ON vendor_categories;

-- Policy: Vendors can only view their own categories
CREATE POLICY "Vendors can view own categories" ON vendor_categories
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Policy: Vendors can insert their own categories
CREATE POLICY "Vendors can insert own categories" ON vendor_categories
  FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Policy: Vendors can update their own categories
CREATE POLICY "Vendors can update own categories" ON vendor_categories
  FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Policy: Vendors can delete their own categories
CREATE POLICY "Vendors can delete own categories" ON vendor_categories
  FOR DELETE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_categories_vendor_id ON vendor_categories(vendor_id);

-- Grant permissions
GRANT ALL ON vendor_categories TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
