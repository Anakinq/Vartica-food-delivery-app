-- Migration: Update auth trigger to handle additional vendor fields
-- This migration enhances the auth trigger to properly handle store name, description, 
-- matric number, department, and late night vendor fields during signup

-- Update the existing function to handle additional vendor fields
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

  -- Create vendor record if role is 'vendor' or 'late_night_vendor'
  IF user_role = 'vendor' OR user_role = 'late_night_vendor' THEN
    -- Extract vendor-specific fields
    store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', 'New Vendor');
    description := NEW.raw_user_meta_data->>'description';
    vendor_type := COALESCE(NEW.raw_user_meta_data->>'vendor_type', 'student');
    matric_number := NEW.raw_user_meta_data->>'matric_number';
    department := NEW.raw_user_meta_data->>'department';
    available_from := NEW.raw_user_meta_data->>'available_from';
    available_until := NEW.raw_user_meta_data->>'available_until';
    
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
      available_until
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
      available_from,
      available_until
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

-- Update the comment
COMMENT ON FUNCTION public.handle_new_user IS 'Updated to handle additional vendor fields including store name, description, matric number, department, and late night vendor availability';