-- Safe SQL script to fix the auth trigger in your Supabase database
-- This version includes better error handling to prevent 500 errors

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a safer function to handle new user profile creation with role-specific records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
  user_phone TEXT;
  vendor_type TEXT;
  store_name TEXT;
  vehicle_type TEXT;
BEGIN
  -- Safely extract user metadata with defaults
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  user_phone := NEW.raw_user_meta_data->>'phone';
  vendor_type := COALESCE(NEW.raw_user_meta_data->>'vendor_type', 'student');
  store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', user_full_name || '''s Store');
  vehicle_type := COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike');

  -- Create base profile - only if email is confirmed or you want to create immediately
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone)
    VALUES (
      NEW.id,
      NEW.email,
      user_full_name,
      user_role,
      user_phone
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the auth process
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Create vendor record if role is 'vendor'
  IF user_role = 'vendor' THEN
    BEGIN
      INSERT INTO public.vendors (user_id, store_name, vendor_type, is_active)
      VALUES (
        NEW.id,
        store_name,
        vendor_type,
        true
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error creating vendor for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Create delivery agent record if role is 'delivery_agent'
  IF user_role = 'delivery_agent' THEN
    BEGIN
      INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available)
      VALUES (
        NEW.id,
        vehicle_type,
        false
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error creating delivery agent for user %: %', NEW.id, SQLERRM;
    END;
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

COMMENT ON FUNCTION public.handle_new_user IS 'Safely creates profile and role-specific records when a user is created';

-- Verify the trigger was created
SELECT tgname as trigger_name, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass AND t.tgname = 'on_auth_user_created';