-- Direct SQL fix for missing vendors table
-- Run this in your Supabase SQL Editor

-- Check if vendors table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'vendors'
);

-- If the above returns false, run the following:

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  description text,
  image_url text,
  vendor_type text NOT NULL CHECK (vendor_type IN ('student', 'late_night')),
  is_active boolean DEFAULT true,
  available_from time,
  available_until time,
  location text,
  matric_number text,
  department text,
  delivery_option text CHECK (delivery_option IN ('offers_hostel_delivery', 'does_not_offer_hostel_delivery')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_type ON vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors(location);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (drop existing first to avoid conflicts)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view active vendors" ON vendors;
  CREATE POLICY "Anyone can view active vendors"
    ON vendors FOR SELECT
    TO authenticated
    USING (is_active = true);
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Vendors can update own store" ON vendors;
  CREATE POLICY "Vendors can update own store"
    ON vendors FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Vendors can insert own store" ON vendors;
  CREATE POLICY "Vendors can insert own store"
    ON vendors FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin can manage all vendors" ON vendors;
  CREATE POLICY "Admin can manage all vendors"
    ON vendors FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
END $$;

-- Add missing columns if they don't exist
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS matric_number text;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS delivery_option text 
CHECK (delivery_option IN ('offers_hostel_delivery', 'does_not_offer_hostel_delivery'));

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create updated_at function and trigger
CREATE OR REPLACE FUNCTION update_vendors_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_vendors_updated_at_column();

-- Add constraint for student vendors
ALTER TABLE vendors 
DROP CONSTRAINT IF EXISTS student_vendor_requires_matric_dept;

ALTER TABLE vendors 
ADD CONSTRAINT student_vendor_requires_matric_dept 
CHECK (
  (vendor_type != 'student' AND matric_number IS NULL AND department IS NULL) 
  OR 
  (vendor_type = 'student' AND matric_number IS NOT NULL AND department IS NOT NULL)
);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON vendors TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;

-- Check if the table exists now
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'vendors'
);