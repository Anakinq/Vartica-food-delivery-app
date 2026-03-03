-- Fix: Foreign Key Error 23503 - Missing profile for cafeteria owner
-- The profiles table uses 'id' (not 'user_id'), and it references auth.users(id)
-- Run this in Supabase SQL Editor

-- ============================================================================
-- The profiles table structure:
-- id uuid PRIMARY KEY REFERENCES auth.users(id) -- This IS the user_id
-- email text UNIQUE NOT NULL
-- full_name text
-- role text
-- ============================================================================

-- Let's check cafeterias and their owners
SELECT 
  c.id as cafeteria_id,
  c.name as cafeteria_name,
  c.user_id as owner_user_id
FROM cafeterias c;

-- Now create profiles for cafeteria owners using the correct columns
-- We need to use the cafeteria's user_id as the profile id
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  c.user_id,  -- Use owner_id as the profile id (references auth.users)
  COALESCE(c.user_id::text || '@cafeteria.local', 'cafeteria@local'),
  COALESCE(c.name, 'Cafeteria'),
  'cafeteria',
  NOW(),
  NOW()
FROM cafeterias c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = c.user_id
  )
ON CONFLICT (id) DO NOTHING;

-- Verify profiles were created
SELECT 
  c.id as cafeteria_id,
  c.name as cafeteria_name, 
  c.user_id as owner_id,
  p.id as profile_id,
  CASE WHEN p.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as profile_status
FROM cafeterias c
LEFT JOIN profiles p ON p.id = c.user_id;
