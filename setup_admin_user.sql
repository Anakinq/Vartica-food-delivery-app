-- SQL Script to Create Admin User
-- Run this in your Supabase SQL Editor

-- First, create the admin user in auth (if not exists)
-- You'll need to create the user account through the app first
-- Then run this to set the role to admin:

-- Update existing user to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@vartica.edu';

-- If the profile doesn't exist, create it:
INSERT INTO profiles (id, email, full_name, role, created_at)
SELECT 
    u.id,
    u.email,
    'System Administrator',
    'admin',
    NOW()
FROM auth.users u
WHERE u.email = 'admin@vartica.edu'
ON CONFLICT (id) 
DO UPDATE SET 
    role = 'admin',
    full_name = 'System Administrator';

-- Verify the admin user was created
SELECT id, email, full_name, role, created_at 
FROM profiles 
WHERE email = 'admin@vartica.edu';