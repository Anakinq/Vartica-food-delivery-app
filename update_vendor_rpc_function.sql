-- Update the upgrade_customer_to_vendor RPC function to include delivery_mode
-- Run this in Supabase SQL Editor

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS upgrade_customer_to_vendor(
  uuid, text, text, text, text, text, text, time, time, text, numeric, boolean
);

-- Create the updated function with new parameters
CREATE OR REPLACE FUNCTION upgrade_customer_to_vendor(
  p_user_id uuid,
  p_store_name text,
  p_description text,
  p_vendor_type text,
  p_matric_number text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_available_from time DEFAULT NULL,
  p_available_until time DEFAULT NULL,
  p_delivery_mode text DEFAULT 'both',
  p_delivery_fee_self numeric DEFAULT 0,
  p_allow_agent_delivery boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile record;
  v_vendor_id uuid;
  v_result json;
BEGIN
  -- Check if profile exists
  SELECT INTO v_profile * FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Check if user is already a vendor
  IF v_profile.is_vendor THEN
    RETURN json_build_object('success', false, 'error', 'User is already a vendor');
  END IF;

  -- Check if vendor record already exists
  SELECT INTO v_vendor_id id FROM vendors WHERE user_id = p_user_id;
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Vendor record already exists');
  END IF;

  -- Create the vendor record with new delivery_mode fields
  INSERT INTO vendors (
    user_id,
    store_name,
    description,
    vendor_type,
    matric_number,
    department,
    available_from,
    available_until,
    delivery_mode,
    delivery_fee_self,
    allow_agent_delivery,
    is_active,
    application_status
  )
  VALUES (
    p_user_id,
    p_store_name,
    p_description,
    p_vendor_type,
    p_matric_number,
    p_department,
    p_available_from,
    p_available_until,
    p_delivery_mode,
    p_delivery_fee_self,
    p_allow_agent_delivery,
    true,
    'approved' -- Auto-approve for now, can be changed to 'pending' for admin approval
  )
  RETURNING id INTO v_vendor_id;

  -- Update the profile to mark as vendor
  UPDATE profiles
  SET 
    is_vendor = true,
    role = 'vendor',
    updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'vendor_id', v_vendor_id,
    'message', 'Successfully upgraded to vendor'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Verify the function was created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'upgrade_customer_to_vendor';
