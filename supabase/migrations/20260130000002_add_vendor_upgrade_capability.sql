-- Add vendor upgrade capability and application tracking
-- This migration enables existing customers to upgrade to vendor status

-- Add application status tracking to vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'pending' 
CHECK (application_status IN ('pending', 'approved', 'rejected'));

-- Add application submitted timestamp
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS application_submitted_at timestamptz DEFAULT now();

-- Add application reviewed timestamp
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS application_reviewed_at timestamptz;

-- Add reviewer user ID
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id);

-- Add rejection reason
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create index for application status queries
CREATE INDEX IF NOT EXISTS idx_vendors_application_status ON vendors(application_status);

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

-- Create function for admin to approve/reject vendor applications
CREATE OR REPLACE FUNCTION public.review_vendor_application(
  p_vendor_id uuid,
  p_action text, -- 'approve' or 'reject'
  p_reviewer_id uuid,
  p_rejection_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  vendor_record vendors%ROWTYPE;
BEGIN
  -- Check if reviewer is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_reviewer_id AND role = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Only admins can review applications'
    );
  END IF;

  -- Get vendor record
  SELECT * INTO vendor_record FROM vendors WHERE id = p_vendor_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Vendor application not found'
    );
  END IF;

  -- Check if application is pending
  IF vendor_record.application_status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Application is not in pending status'
    );
  END IF;

  -- Perform the review action
  IF p_action = 'approve' THEN
    UPDATE vendors 
    SET 
      application_status = 'approved',
      application_reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      is_active = true,
      updated_at = now()
    WHERE id = p_vendor_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Vendor application approved successfully'
    );
    
  ELSIF p_action = 'reject' THEN
    UPDATE vendors 
    SET 
      application_status = 'rejected',
      application_reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      rejection_reason = p_rejection_reason,
      updated_at = now()
    WHERE id = p_vendor_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Vendor application rejected'
    );
    
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid action. Use "approve" or "reject"'
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.review_vendor_application TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.upgrade_customer_to_vendor IS 'Allows existing customers to apply for vendor status with proper validation and application tracking';
COMMENT ON FUNCTION public.review_vendor_application IS 'Allows admins to approve or reject vendor applications';