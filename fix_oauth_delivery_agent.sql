-- Fix for OAuth delivery agent sign up issue
-- This script updates the auth trigger to properly handle OAuth roles including delivery_agent

-- First, ensure we have the multi-role support columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_delivery_agent BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_vendor BOOLEAN DEFAULT FALSE;

-- Update existing records to set appropriate flags
UPDATE profiles 
SET is_vendor = TRUE 
WHERE role IN ('vendor', 'late_night_vendor');

UPDATE profiles 
SET is_delivery_agent = TRUE 
WHERE role = 'delivery_agent';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_vendor ON profiles(is_vendor);
CREATE INDEX IF NOT EXISTS idx_profiles_is_delivery_agent ON profiles(is_delivery_agent);

-- Drop existing trigger and function to recreate with proper OAuth support
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the updated function that properly handles OAuth roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  full_name TEXT;
  phone TEXT;
  store_name TEXT;
  vendor_type TEXT;
  vehicle_type TEXT;
BEGIN
  -- Determine the user's role with better priority handling
  -- Priority: 1. raw_user_meta_data role, 2. app_metadata role, 3. default to 'customer'
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.app_metadata->>'role',
    'customer'
  );
  
  -- Get user details with better fallbacks
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  
  phone := NEW.raw_user_meta_data->>'phone';
  store_name := NEW.raw_user_meta_data->>'store_name';
  vendor_type := COALESCE(NEW.raw_user_meta_data->>'vendor_type', 'student');
  vehicle_type := COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike');
  
  -- Create or update base profile with role flags
  INSERT INTO public.profiles (id, email, full_name, role, phone, is_vendor, is_delivery_agent)
  VALUES (
    NEW.id,
    NEW.email,
    full_name,
    user_role,
    phone,
    CASE WHEN user_role IN ('vendor', 'late_night_vendor') THEN TRUE ELSE FALSE END,
    CASE WHEN user_role = 'delivery_agent' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    is_vendor = CASE 
      WHEN EXCLUDED.role IN ('vendor', 'late_night_vendor') THEN TRUE 
      ELSE profiles.is_vendor 
    END,
    is_delivery_agent = CASE 
      WHEN EXCLUDED.role = 'delivery_agent' THEN TRUE 
      ELSE profiles.is_delivery_agent 
    END;

  -- Create or update vendor record if role is 'vendor'
  IF user_role = 'vendor' THEN
    INSERT INTO public.vendors (user_id, store_name, vendor_type, is_active)
    VALUES (
      NEW.id,
      COALESCE(store_name, full_name || '''s Store'),
      vendor_type,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      vendor_type = EXCLUDED.vendor_type;
  END IF;

  -- Create or update delivery agent record if role is 'delivery_agent'
  IF user_role = 'delivery_agent' THEN
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating)
    VALUES (
      NEW.id,
      vehicle_type,
      false,
      0,
      0,
      0.0
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_type = EXCLUDED.vehicle_type;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION public.handle_new_user IS 'Updated to properly handle OAuth role assignment including delivery_agent role';

-- Verify the trigger was created
SELECT tgname as trigger_name, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass AND t.tgname = 'on_auth_user_created';