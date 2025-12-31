-- Create hostel delivery fee matrix table

-- Create hostels table to define different hostels
CREATE TABLE IF NOT EXISTS hostels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT, -- 'female', 'male', 'medical', 'other'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create delivery fee matrix table
CREATE TABLE IF NOT EXISTS delivery_fee_matrix (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_location TEXT NOT NULL, -- vendor location (e.g., 'med_side', 'main_school')
  to_location TEXT NOT NULL,   -- customer location (e.g., 'new_female_hostel_1', 'male_hostel_1')
  delivery_fee NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_fee_matrix ENABLE ROW LEVEL SECURITY;

-- Create policies for hostels table
CREATE POLICY "Hostels are viewable by everyone" ON hostels
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert hostels" ON hostels
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can update hostels" ON hostels
  FOR UPDATE USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete hostels" ON hostels
  FOR DELETE USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for delivery_fee_matrix table
CREATE POLICY "Delivery fee matrix is viewable by everyone" ON delivery_fee_matrix
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert delivery fee matrix" ON delivery_fee_matrix
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can update delivery fee matrix" ON delivery_fee_matrix
  FOR UPDATE USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete delivery fee matrix" ON delivery_fee_matrix
  FOR DELETE USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hostels_name ON hostels(name);
CREATE INDEX IF NOT EXISTS idx_delivery_fee_matrix_locations ON delivery_fee_matrix(from_location, to_location);

-- Insert hostels
INSERT INTO hostels (name, category) VALUES
('New Female Hostel 1', 'female'),
('New Female Hostel 2', 'female'),
('Caf 2', 'cafeteria'),
('Caf 1', 'cafeteria'),
('Smoothie Shack', 'cafeteria'),
('Captain Cook', 'cafeteria'),
('Staff Caf', 'cafeteria'),
('Med caf', 'cafeteria'),
('Seasons', 'cafeteria'),
('Abuad Hostel', 'other'),
('Wema Hostel', 'other'),
('Male Hostel 1', 'male'),
('Male Hostel 2', 'male'),
('Male Hostel 3', 'male'),
('Male Hostel 4', 'male'),
('Male Hostel 5', 'male'),
('Male Hostel 6', 'male'),
('Medical Male Hostel 1', 'medical'),
('Medical Male Hostel 2', 'medical'),
('Female Medical Hostel 1', 'medical'),
('Female Medical Hostel 2', 'medical'),
('Female Medical Hostel 3', 'medical'),
('Female Medical Hostel 4', 'medical'),
('Female Medical Hostel 5', 'medical'),
('Female Medical Hostel 6', 'medical');

-- Insert delivery fee matrix
-- Med Side to Med Side: ₦1000
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT 'med_side', name, 1000.00 FROM hostels WHERE name = 'Med caf';

-- Med Side to other hostels: ₦1500
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT 'med_side', name, 1500.00 FROM hostels WHERE name IN (
  'New Female Hostel 1', 'New Female Hostel 2', 'Abuad Hostel', 'Wema Hostel',
  'Male Hostel 1', 'Male Hostel 2', 'Male Hostel 3', 'Male Hostel 4', 
  'Male Hostel 5', 'Male Hostel 6'
);

-- Med Side to medical hostels: ₦2000
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT 'med_side', name, 2000.00 FROM hostels WHERE name IN (
  'Medical Male Hostel 1', 'Medical Male Hostel 2',
  'Female Medical Hostel 1', 'Female Medical Hostel 2', 
  'Female Medical Hostel 3', 'Female Medical Hostel 4', 
  'Female Medical Hostel 5', 'Female Medical Hostel 6'
);

-- Main School to other hostels: ₦1000
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT 'main_school', name, 1000.00 FROM hostels WHERE name IN (
  'New Female Hostel 1', 'New Female Hostel 2', 'Abuad Hostel', 'Wema Hostel',
  'Male Hostel 1', 'Male Hostel 2', 'Male Hostel 3', 'Male Hostel 4', 
  'Male Hostel 5', 'Male Hostel 6'
);

-- Main School to Med Side: ₦1500
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT 'main_school', name, 1500.00 FROM hostels WHERE name = 'Med caf';

-- Main School to medical hostels: ₦1500
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT 'main_school', name, 1500.00 FROM hostels WHERE name IN (
  'Medical Male Hostel 1', 'Medical Male Hostel 2'
);

-- Medical hostels to Caf 2: ₦2000
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 2000.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN (
  'Medical Male Hostel 1', 'Medical Male Hostel 2',
  'Female Medical Hostel 1', 'Female Medical Hostel 2', 
  'Female Medical Hostel 3', 'Female Medical Hostel 4', 
  'Female Medical Hostel 5', 'Female Medical Hostel 6'
) AND h2.name = 'Caf 2';

-- Medical hostels to other locations
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 1500.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN (
  'Medical Male Hostel 1', 'Medical Male Hostel 2',
  'Female Medical Hostel 1', 'Female Medical Hostel 2', 
  'Female Medical Hostel 3', 'Female Medical Hostel 4', 
  'Female Medical Hostel 5', 'Female Medical Hostel 6'
) AND h2.name IN ('Caf 1', 'Smoothie Shack', 'Captain Cook', 'Staff Caf', 'Seasons');

-- Medical hostels to Med caf: ₦700
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 700.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN (
  'Medical Male Hostel 1', 'Medical Male Hostel 2',
  'Female Medical Hostel 1', 'Female Medical Hostel 2', 
  'Female Medical Hostel 3', 'Female Medical Hostel 4', 
  'Female Medical Hostel 5', 'Female Medical Hostel 6'
) AND h2.name = 'Med caf';

-- Medical hostels to Seasons: ₦1000
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 1000.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN (
  'Medical Male Hostel 1', 'Medical Male Hostel 2',
  'Female Medical Hostel 1', 'Female Medical Hostel 2', 
  'Female Medical Hostel 3', 'Female Medical Hostel 4', 
  'Female Medical Hostel 5', 'Female Medical Hostel 6'
) AND h2.name = 'Seasons';

-- Abuad/Wema hostels to Caf 2: ₦700
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 700.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN ('Abuad Hostel', 'Wema Hostel') AND h2.name = 'Caf 2';

-- Abuad/Wema hostels to other locations: ₦1500
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 1500.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN ('Abuad Hostel', 'Wema Hostel') AND h2.name IN ('Caf 1', 'Smoothie Shack', 'Captain Cook', 'Staff Caf', 'Med caf', 'Seasons');

-- Male hostels to Caf 2: ₦1500
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 1500.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN ('Male Hostel 1', 'Male Hostel 2', 'Male Hostel 3', 'Male Hostel 4', 'Male Hostel 5', 'Male Hostel 6') AND h2.name = 'Caf 2';

-- Male hostels to other locations: ₦1000
INSERT INTO delivery_fee_matrix (from_location, to_location, delivery_fee) 
SELECT h1.name, h2.name, 1000.00 FROM 
  hostels h1, hostels h2 
WHERE h1.name IN ('Male Hostel 1', 'Male Hostel 2', 'Male Hostel 3', 'Male Hostel 4', 'Male Hostel 5', 'Male Hostel 6') AND h2.name IN ('Caf 1', 'Smoothie Shack', 'Captain Cook', 'Staff Caf', 'Med caf', 'Seasons');

-- Create a function to get delivery fee based on vendor and customer locations
CREATE OR REPLACE FUNCTION get_delivery_fee(p_vendor_location TEXT, p_customer_location TEXT)
RETURNS NUMERIC AS $$
DECLARE
  fee NUMERIC;
BEGIN
  SELECT delivery_fee INTO fee
  FROM delivery_fee_matrix
  WHERE from_location = p_vendor_location AND to_location = p_customer_location;
  
  IF fee IS NULL THEN
    -- Default fee if not found in matrix
    RETURN 1000.00;
  END IF;
  
  RETURN fee;
END;
$$ LANGUAGE plpgsql;

-- Add customer location field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hostel_location TEXT;

-- Add location field to vendors table to distinguish between med side and main school late night vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors(location);

-- Update existing late night vendors to have location
UPDATE vendors 
SET location = 'med_side' 
WHERE vendor_type = 'late_night' AND store_name ILIKE '%med%';

UPDATE vendors 
SET location = 'main_school' 
WHERE vendor_type = 'late_night' AND (store_name ILIKE '%main%' OR store_name ILIKE '%school%');

-- For any remaining late night vendors without location, set default
UPDATE vendors 
SET location = 'main_school' 
WHERE vendor_type = 'late_night' AND location IS NULL;