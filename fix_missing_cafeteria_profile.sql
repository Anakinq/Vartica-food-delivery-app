-- Fix: Foreign Key Error 23503 - Missing profile for cafeteria owner
-- Run this in Supabase SQL Editor

-- ============================================================================
-- The real error is: notifications table needs a profile for the seller
-- When order is created for cafeteria, a notification tries to reference
-- the cafeteria's owner_id as user_id, but no profile exists
-- ============================================================================

-- Step 1: Find cafeterias without profiles and create them
INSERT INTO profiles (id, user_id, full_name, role, created_at, updated_at)
SELECT 
  c.owner_id,
  c.owner_id,
  COALESCE(c.name, 'Cafeteria'),
  'cafeteria',
  NOW(),
  NOW()
FROM cafeterias c
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = c.owner_id
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Verify profiles were created
SELECT 
  c.id as cafeteria_id,
  c.name as cafeteria_name, 
  c.owner_id,
  p.id as profile_id,
  CASE WHEN p.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as profile_status
FROM cafeterias c
LEFT JOIN profiles p ON p.user_id = c.owner_id;

-- Step 3: Check if there are any other missing profiles for order sellers
-- This checks for vendors too
SELECT 
  'vendor' as seller_type,
  v.id as seller_id,
  v.name as seller_name,
  v.owner_id as user_id,
  p.id as profile_id,
  CASE WHEN p.id IS NOT NULL THEN 'OK' ELSE 'MISSING' END as status
FROM vendors v
LEFT JOIN profiles p ON p.user_id = v.owner_id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'cafeteria' as seller_type,
  c.id as seller_id,
  c.name as seller_name,
  c.owner_id as user_id,
  p.id as profile_id,
  CASE WHEN p.id IS NOT NULL THEN 'OK' ELSE 'MISSING' END as status
FROM cafeterias c
LEFT JOIN profiles p ON p.user_id = c.owner_id
WHERE p.id IS NULL;
