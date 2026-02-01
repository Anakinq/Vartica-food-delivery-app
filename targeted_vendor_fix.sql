-- TARGETED FIX FOR MISSING VENDOR COLUMNS
-- This script only adds the missing columns based on your schema

-- SECTION 1: Add the missing time columns for late night vendors
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS available_from time;

ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS available_until time;

-- SECTION 2: Verify the columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'vendors' 
  AND column_name IN ('available_from', 'available_until')
ORDER BY ordinal_position;

-- SECTION 3: Create indexes for the new columns (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_vendors_available_from ON vendors(available_from);
CREATE INDEX IF NOT EXISTS idx_vendors_available_until ON vendors(available_until);

-- SECTION 4: Update the vendor upgrade function to work with your schema
-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.upgrade_customer_to_vendor(uuid, text, text, text, text, text, time, time, text);

-- Create the function that matches your exact schema
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

-- SECTION 5: Grant execute permission
GRANT EXECUTE ON FUNCTION public.upgrade_customer_to_vendor TO authenticated;

-- SECTION 6: Verify the function was created
SELECT 
  proname,
  proargnames,
  proargtypes
FROM pg_proc 
WHERE proname = 'upgrade_customer_to_vendor';

-- SECTION 7: Test the setup (commented out - uncomment to test)
/*
-- This will show the current vendors table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position;
*/