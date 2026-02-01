-- Combined fix for vendor upgrade functionality
-- Run this in your Supabase SQL Editor

-- First, create the vendors table if it doesn't exist
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  description text,
  image_url text,
  vendor_type text NOT NULL CHECK (vendor_type IN ('student', 'late_night')),
  is_active boolean DEFAULT true,
  available_from time,
  available_until time,
  location text,
  matric_number text,
  department text,
  delivery_option text CHECK (delivery_option IN ('offers_hostel_delivery', 'does_not_offer_hostel_delivery')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_vendor_type ON vendors(vendor_type);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors(location);
CREATE INDEX IF NOT EXISTS idx_vendors_application_status ON vendors(application_status);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view active vendors" ON vendors;
  CREATE POLICY "Anyone can view active vendors"
    ON vendors FOR SELECT
    TO authenticated
    USING (is_active = true);
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Vendors can update own store" ON vendors;
  CREATE POLICY "Vendors can update own store"
    ON vendors FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Vendors can insert own store" ON vendors;
  CREATE POLICY "Vendors can insert own store"
    ON vendors FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin can manage all vendors" ON vendors;
  CREATE POLICY "Admin can manage all vendors"
    ON vendors FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
END $$;

-- Add missing columns if they don't exist
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS matric_number text;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS delivery_option text 
CHECK (delivery_option IN ('offers_hostel_delivery', 'does_not_offer_hostel_delivery'));

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add application tracking columns
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

-- Create updated_at function and trigger
CREATE OR REPLACE FUNCTION update_vendors_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_vendors_updated_at_column();

-- Add constraint for student vendors
ALTER TABLE vendors 
DROP CONSTRAINT IF EXISTS student_vendor_requires_matric_dept;

ALTER TABLE vendors 
ADD CONSTRAINT student_vendor_requires_matric_dept 
CHECK (
  (vendor_type != 'student' AND matric_number IS NULL AND department IS NULL) 
  OR 
  (vendor_type = 'student' AND matric_number IS NOT NULL AND department IS NOT NULL)
);

-- Fix auth trigger function
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

-- Create function to handle vendor upgrade for existing customers
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
  vendor_record vendors%ROWTYPE;
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

  -- Insert vendor record
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
  RETURNING * INTO vendor_record;

  -- Return success response
  RETURN json_build_object(
    'success', true,
    'vendor_id', vendor_record.id,
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upgrade_customer_to_vendor TO authenticated;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON vendors TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Verify the function exists
SELECT proname, proargnames 
FROM pg_proc 
WHERE proname = 'upgrade_customer_to_vendor';