-- Script to create missing vendor records for approved vendors
-- Run this in your Supabase SQL Editor

-- First, let's see what users have vendor role but no vendor record
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.role,
    p.vendor_approved,
    v.id as vendor_record_exists
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE p.role IN ('vendor', 'late_night_vendor')
AND v.id IS NULL;

-- For each user found above, run this INSERT statement:
-- Replace 'USER_ID_HERE' with the actual user ID from the query above

INSERT INTO vendors (
    user_id,
    store_name,
    description,
    vendor_type,
    is_active,
    application_status,
    application_submitted_at,
    image_url
) VALUES (
    'USER_ID_HERE',  -- Replace with actual user ID
    'Vendor Store',  -- Customize store name
    'Food vendor business',  -- Customize description
    'student',  -- or 'late_night'
    true,  -- is_active
    'approved',  -- application_status
    NOW(),  -- application_submitted_at
    'https://placehold.co/400x400/e2e8f0/64748b?text=Vendor+Logo'  -- default image
)
ON CONFLICT (user_id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    description = EXCLUDED.description,
    vendor_type = EXCLUDED.vendor_type,
    is_active = EXCLUDED.is_active,
    application_status = EXCLUDED.application_status;

-- Verify the fix worked
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    v.store_name,
    v.application_status
FROM profiles p
JOIN vendors v ON p.id = v.user_id
WHERE p.id = 'USER_ID_HERE';  -- Replace with your user ID