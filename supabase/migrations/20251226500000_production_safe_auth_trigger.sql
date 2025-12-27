-- Migration: Production-safe auth trigger for profile and role-specific record creation
-- This trigger creates profiles and role-specific records immediately on user creation
-- Based on Supabase best practices - create records on INSERT, control access via RLS

-- Drop existing trigger and function to recreate with production-safe approach
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create production-safe function to handle new user profile creation with role-specific records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  -- Create base profile
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create vendor record if role is 'vendor'
  IF user_role = 'vendor' THEN
    INSERT INTO public.vendors (user_id, store_name, vendor_type, is_active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'store_name', 'New Vendor'),
      COALESCE(NEW.raw_user_meta_data->>'vendor_type', 'student'),
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Create delivery agent record if role is 'delivery_agent'
  IF user_role = 'delivery_agent' THEN
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike'),
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER INSERT only (not UPDATE) to avoid multiple executions
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and role-specific records when a user is created';