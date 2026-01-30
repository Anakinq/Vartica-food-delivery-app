-- Fix: Update auth trigger to properly handle vendor creation
-- This ensures the handle_new_user function correctly creates vendor records
-- with all required fields and proper error handling

-- Drop existing trigger and function to recreate with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create enhanced function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  store_name text;
  description text;
  vendor_type text;
  matric_number text;
  department text;
  available_from text;
  available_until text;
  location text;
  delivery_option text;
BEGIN
  -- Extract user role, default to 'customer' if not specified
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

  -- Handle vendor creation with comprehensive field handling
  IF user_role = 'vendor' OR user_role = 'late_night_vendor' THEN
    -- Extract all vendor-specific fields
    store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', 
                          NEW.raw_user_meta_data->>'full_name' || '''s Store',
                          'New Vendor');
    description := NEW.raw_user_meta_data->>'description';
    vendor_type := COALESCE(NEW.raw_user_meta_data->>'vendor_type', 
                           CASE WHEN user_role = 'late_night_vendor' THEN 'late_night' ELSE 'student' END);
    matric_number := NEW.raw_user_meta_data->>'matric_number';
    department := NEW.raw_user_meta_data->>'department';
    available_from := NEW.raw_user_meta_data->>'available_from';
    available_until := NEW.raw_user_meta_data->>'available_until';
    location := NEW.raw_user_meta_data->>'location';
    delivery_option := NEW.raw_user_meta_data->>'delivery_option';
    
    -- Insert vendor record with all available fields
    INSERT INTO public.vendors (
      user_id, 
      store_name, 
      description, 
      image_url,
      vendor_type, 
      is_active,
      matric_number,
      department,
      available_from,
      available_until,
      location,
      delivery_option
    )
    VALUES (
      NEW.id,
      store_name,
      description,
      CASE 
        WHEN user_role = 'late_night_vendor' THEN 'https://placehold.co/400x400/4f46e5/white?text=Late+Night'
        ELSE 'https://placehold.co/400x400/e2e8f0/64748b?text=Vendor+Logo'
      END,
      vendor_type,
      true,
      matric_number,
      department,
      CASE WHEN available_from IS NOT NULL THEN available_from::time ELSE NULL END,
      CASE WHEN available_until IS NOT NULL THEN available_until::time ELSE NULL END,
      location,
      delivery_option
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Handle delivery agent creation
  IF user_role = 'delivery_agent' THEN
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike'),
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Handle cafeteria creation (if needed)
  IF user_role = 'cafeteria' THEN
    INSERT INTO public.cafeterias (user_id, name, is_active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'cafeteria_name', 'New Cafeteria'),
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the entire transaction
    RAISE WARNING 'Error in handle_new_user function: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER INSERT only
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user IS 'Handles new user creation with comprehensive role-specific record creation including vendors, delivery agents, and cafeterias with proper error handling';