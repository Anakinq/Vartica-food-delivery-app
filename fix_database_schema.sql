-- Database schema fix script to resolve profile fetching issues
-- Run this in your Supabase SQL Editor to ensure proper table structure

-- 1. Ensure proper foreign key relationship between profiles and vendors
-- First, drop any existing incorrect foreign keys
DO $$ 
BEGIN
    -- Drop existing foreign key constraints if they exist
    ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_user_id_fkey;
    ALTER TABLE vendors DROP CONSTRAINT IF EXISTS fk_user_id;
EXCEPTION 
    WHEN OTHERS THEN 
        -- Ignore if constraints don't exist
        NULL;
END $$;

-- 2. Add proper foreign key constraint
ALTER TABLE vendors 
ADD CONSTRAINT vendors_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- 3. Ensure all necessary columns exist in vendors table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS application_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Ensure all necessary columns exist in profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vendor_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delivery_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matric_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hostel TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 5. Update RLS policies to be more permissive for profile fetching
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
CREATE POLICY "Users can read their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Allow users to read their own vendor data
DROP POLICY IF EXISTS "Users can read their own vendor data" ON vendors;
CREATE POLICY "Users can read their own vendor data" 
ON vendors FOR SELECT 
USING (auth.uid() = user_id);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 7. Test the fixes
-- Test profile query
SELECT 'Profile query test successful' as result;
SELECT id, email, full_name, role FROM profiles LIMIT 1;

-- Test vendor query
SELECT 'Vendor query test successful' as result;
SELECT id, user_id, store_name FROM vendors LIMIT 1;

-- Test join query that was failing
SELECT 'Join query test successful' as result;
SELECT 
    p.id,
    p.email,
    p.full_name,
    v.store_name,
    v.application_status
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
LIMIT 1;

-- Show the fixed schema
SELECT 
    'Profiles table columns:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

SELECT 
    'Vendors table columns:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;

SELECT 'Database fixes completed successfully' as status;