-- Migration: Add avatar_url and hostel_location to profiles table

-- Add avatar_url column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add hostel_location column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hostel_location TEXT;

-- Update RLS policies to allow users to update these new columns
ALTER POLICY "Users can update own profile" ON profiles 
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile avatar image';
COMMENT ON COLUMN profiles.hostel_location IS 'User hostel location for delivery purposes';