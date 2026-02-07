# Fix for Signup 500 Internal Server Error

## Issue
The signup is failing with a 500 Internal Server Error, likely due to issues with the auth trigger function that runs when a new user is created.

## Root Cause
The auth trigger function `handle_new_user()` that automatically creates profile records when a user signs up may have issues with:
1. Table/column mismatches
2. Permission issues
3. Constraint violations

## Solution

### Option 1: Fix the Auth Trigger (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix the auth trigger to handle errors gracefully
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with better error handling
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

  -- Create base profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_full_name,
      user_role,
      user_phone,
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the auth process
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Create vendor record if role is 'vendor' with error handling
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
        RAISE WARNING 'Error creating vendor for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Create delivery agent record if role is 'delivery_agent' with error handling
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
        RAISE WARNING 'Error creating delivery agent for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER INSERT
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
```

### Option 2: Temporary Fix - Disable the Trigger

If the above doesn't work, temporarily disable the trigger:

```sql
-- Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

Then manually create user profiles after signup through your application code.

### Option 3: Check Database Tables

Verify that the required tables exist:

```sql
-- Check if profiles table exists
SELECT * FROM information_schema.tables WHERE table_name = 'profiles';

-- Check if delivery_agents table exists
SELECT * FROM information_schema.tables WHERE table_name = 'delivery_agents';

-- Check if vendors table exists
SELECT * FROM information_schema.tables WHERE table_name = 'vendors';
```

## Input Visibility Fix

For the white text on white background issue, the signup form input fields have been updated with explicit text and background colors to ensure visibility in both light and dark modes.

## Verification Steps

1. Apply the SQL fix to your Supabase database
2. Restart your application
3. Try signing up with a new account
4. Check the browser console and network tab for any remaining errors
5. Verify that the user profile is created in the database after successful signup