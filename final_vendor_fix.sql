-- FINAL COMPREHENSIVE FIX FOR VENDOR UPGRADE FUNCTIONALITY
-- This script aligns with your existing database schema

-- SECTION 1: Verify current vendors table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;

-- SECTION 2: Add missing time columns for late night vendors
-- These are needed for the vendor upgrade function
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS available_from time;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS available_until time;

-- SECTION 3: Ensure all required columns exist (based on your schema)
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'pending' 
CHECK (application_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS application_submitted_at timestamptz DEFAULT now();

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS application_reviewed_at timestamptz;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id);

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- SECTION 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_application_status ON vendors(application_status);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);

-- SECTION 5: Fix auth trigger function to match your schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

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
  
  -- Create base profile with all fields from your schema
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    phone,
    hostel,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'hostel',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    hostel = EXCLUDED.hostel,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

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
    
    -- Insert vendor record with all available fields (matching your schema)
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
      delivery_option,
      application_status,
      application_submitted_at
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
      delivery_option,
      'pending',
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      description = EXCLUDED.description,
      vendor_type = EXCLUDED.vendor_type,
      matric_number = EXCLUDED.matric_number,
      department = EXCLUDED.department,
      available_from = EXCLUDED.available_from,
      available_until = EXCLUDED.available_until,
      location = EXCLUDED.location,
      delivery_option = EXCLUDED.delivery_option,
      updated_at = now();
  END IF;

  -- Handle delivery agent creation
  IF user_role = 'delivery_agent' THEN
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike'),
      false
    )
    ON CONFLICT (user_id) DO UPDATE SET
      vehicle_type = EXCLUDED.vehicle_type,
      updated_at = now();
  END IF;

  -- Handle cafeteria creation (if needed)
  IF user_role = 'cafeteria' THEN
    INSERT INTO public.cafeterias (user_id, name, is_active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'cafeteria_name', 'New Cafeteria'),
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = now();
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

-- SECTION 6: Create the vendor upgrade function that matches your schema
CREATE OR REPLACE FUNCTION public.upgrade_customer_to_vendor(
  p_user_id uuid,
  p_store_name text,
  p_description text,
  p_vendor_type text,
  p_matric_number text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_available_from time DEFAULT NULL,
  p_available_until time DEFAULT NULL,
  p_delivery_option text DEFAULT 'does_not_offer_hostel_delivery'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  vendor_record record;
BEGIN
  -- Check if user exists and is a customer
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND role = 'customer'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found or not a customer'
    );
  END IF;

  -- Check if vendor record already exists for this user
  IF EXISTS (
    SELECT 1 FROM vendors 
    WHERE user_id = p_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vendor record already exists for this user'
    );
  END IF;

  -- Update user role to vendor
  UPDATE profiles 
  SET role = 'vendor', updated_at = now()
  WHERE id = p_user_id;

  -- Insert vendor record (matching your exact schema)
  INSERT INTO vendors (
    user_id,
    store_name,
    description,
    vendor_type,
    matric_number,
    department,
    available_from,
    available_until,
    delivery_option,
    is_active,
    application_status,
    application_submitted_at,
    image_url
  ) VALUES (
    p_user_id,
    p_store_name,
    p_description,
    p_vendor_type,
    p_matric_number,
    p_department,
    p_available_from,
    p_available_until,
    p_delivery_option,
    false, -- Initially inactive until approved
    'pending',
    now(),
    CASE 
      WHEN p_vendor_type = 'late_night' THEN 'https://placehold.co/400x400/4f46e5/white?text=Late+Night'
      ELSE 'https://placehold.co/400x400/e2e8f0/64748b?text=Vendor+Logo'
    END
  )
  RETURNING id, store_name, application_status INTO vendor_record;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'vendor_id', vendor_record.id,
    'store_name', vendor_record.store_name,
    'application_status', vendor_record.application_status,
    'message', 'Vendor application submitted successfully. Awaiting admin approval.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- SECTION 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON vendors TO postgres, anon, authenticated, service_role;
GRANT ALL ON profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON delivery_agents TO postgres, anon, authenticated, service_role;
GRANT ALL ON cafeterias TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upgrade_customer_to_vendor TO authenticated;

-- SECTION 8: Verify the setup is complete
SELECT 
  'vendors table' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;

SELECT 
  'profiles table' as table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

SELECT 
  proname,
  proargnames
FROM pg_proc 
WHERE proname = 'upgrade_customer_to_vendor';

-- SECTION 9: Test the function (commented out - uncomment to test with real data)
/*
SELECT public.upgrade_customer_to_vendor(
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
  'Test Store',
  'Test Description',
  'student',
  'MAT123456',
  'Computer Science',
  NULL,
  NULL,
  'does_not_offer_hostel_delivery'
);
*/