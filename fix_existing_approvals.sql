-- Script to fix already-approved applications that weren't saved to database
-- Run this in your Supabase SQL Editor

-- First, let's see what applications are currently in pending status
SELECT 
    v.id,
    v.store_name,
    v.user_id,
    p.full_name as user_name,
    p.email as user_email,
    v.application_status,
    v.application_submitted_at
FROM vendors v
JOIN profiles p ON v.user_id = p.id
WHERE v.application_status = 'pending'
ORDER BY v.application_submitted_at DESC;

-- Approve the specific pending applications you identified

-- Approve "Scents and Strands" application
UPDATE vendors 
SET 
    application_status = 'approved',
    application_reviewed_at = now(),
    is_active = true,
    updated_at = now()
WHERE id = '35aac75b-16f8-43d1-95a6-8484f79e23c0';

-- Update the user's profile for Scents and Strands
UPDATE profiles
SET role = 'vendor',
    updated_at = now()
WHERE id = 'c49693ac-307a-492c-b6ed-55ada1fb1fde';

-- Approve "Late-Night Vendors" application
UPDATE vendors 
SET 
    application_status = 'approved',
    application_reviewed_at = now(),
    is_active = true,
    updated_at = now()
WHERE id = '753c5f78-1a47-4909-95e4-d64bea3a651b';

-- Update the user's profile for Late-Night Vendors
UPDATE profiles
SET role = 'vendor',
    updated_at = now()
WHERE id = '89974077-45e3-4b1a-bae5-d2833c5fb123';

-- Verify the updates
SELECT 
    v.id,
    v.store_name,
    v.user_id,
    p.full_name as user_name,
    p.email as user_email,
    v.application_status,
    v.application_reviewed_at
FROM vendors v
JOIN profiles p ON v.user_id = p.id
WHERE v.id IN ('35aac75b-16f8-43d1-95a6-8484f79e23c0', '753c5f78-1a47-4909-95e4-d64bea3a651b');

-- Alternative: If you want to approve ALL pending applications (use with caution!)
/*
UPDATE vendors 
SET 
    application_status = 'approved',
    application_reviewed_at = now(),
    is_active = true,
    updated_at = now()
WHERE application_status = 'pending';

-- Update all corresponding profiles
UPDATE profiles
SET role = 'vendor',
    updated_at = now()
WHERE id IN (SELECT user_id FROM vendors WHERE application_status = 'approved');
*/