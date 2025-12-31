-- Create two specific late night vendor accounts

-- Create Med Side Late Night Vendor
INSERT INTO vendors (user_id, store_name, description, image_url, vendor_type, is_active, location, available_from, available_until)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'medside@example.com' LIMIT 1), -- This will be NULL if user doesn't exist
  'Med Side Late Night Vendor',
  'Late night food vendor located at the medical side of campus',
  'https://placehold.co/400x400/4f46e5/white?text=Med+Late+Night',
  'late_night',
  true,
  'med_side',
  '21:00',
  '03:00'
)
ON CONFLICT (user_id) DO NOTHING;

-- Create Main School Late Night Vendor
INSERT INTO vendors (user_id, store_name, description, image_url, vendor_type, is_active, location, available_from, available_until)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'mainschool@example.com' LIMIT 1), -- This will be NULL if user doesn't exist
  'Main School Late Night Vendor',
  'Late night food vendor located at the main school area',
  'https://placehold.co/400x400/10b981/white?text=Main+Late+Night',
  'late_night',
  true,
  'main_school',
  '21:00',
  '03:00'
)
ON CONFLICT (user_id) DO NOTHING;

-- If the users don't exist, create them with placeholder emails
-- You would need to create actual user accounts in Supabase auth for these vendors
-- This is just to demonstrate the vendor records that should exist

-- Update existing late night vendors if they exist to have proper location
UPDATE vendors 
SET location = 'med_side'
WHERE store_name ILIKE '%med%' AND vendor_type = 'late_night';

UPDATE vendors 
SET location = 'main_school'
WHERE (store_name ILIKE '%main%' OR store_name ILIKE '%school%') AND vendor_type = 'late_night'
AND location IS DISTINCT FROM 'med_side'; -- Only update if not already med_side