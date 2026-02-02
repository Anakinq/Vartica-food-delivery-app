-- Fix any vendors that were approved in profiles table but not in vendors table
-- This SQL script ensures that the vendors table matches the approval status in profiles table

-- Update vendors table to match the approval status from profiles
UPDATE vendors 
SET 
  is_active = true,
  application_status = 'approved'
FROM profiles 
WHERE vendors.user_id = profiles.id 
  AND profiles.vendor_approved = true
  AND (vendors.application_status IS NULL OR vendors.application_status != 'approved');

-- Verify the fix worked by checking for any remaining inconsistencies
SELECT 
  p.id,
  p.email,
  p.vendor_approved,
  v.application_status,
  v.is_active
FROM profiles p
JOIN vendors v ON p.id = v.user_id
WHERE p.vendor_approved = true 
  AND (v.application_status IS NULL OR v.application_status != 'approved');