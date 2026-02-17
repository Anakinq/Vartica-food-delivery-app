-- Add hostel_location column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS hostel_location TEXT;

-- Also add to public.profiles if using schema
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hostel_location TEXT;

COMMENT ON COLUMN profiles.hostel_location IS 'Customer''s hostel/hostel location for delivery';
