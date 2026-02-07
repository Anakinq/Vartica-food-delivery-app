-- Migration: Update auth trigger to better handle OAuth role assignment
-- This migration enhances the existing auth trigger to properly handle OAuth roles
-- by checking for roles in app_metadata as well as raw_user_meta_data

-- Update the existing function to handle app_metadata roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  full_name text;
  phone text;
  store_name text;
  vendor_type text;
  vehicle_type text;
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
  
  -- Create or update base profile
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    full_name,
    user_role,
    phone
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

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
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available)
    VALUES (
      NEW.id,
      COALESCE(vehicle_type, 'Bike'),
      false
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_type = COALESCE(EXCLUDED.vehicle_type, delivery_agents.vehicle_type);
  END IF;

  RETURN NEW;
END;
$$;

-- Update the comment
COMMENT ON FUNCTION public.handle_new_user IS 'Updated to better handle OAuth role assignment by checking app_metadata';