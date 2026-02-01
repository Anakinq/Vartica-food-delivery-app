-- Create function for admin to approve/reject vendor applications
-- This function will properly update the database when admin reviews applications

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
  vendor_record vendors%ROWTYPE;
BEGIN
  -- Check if reviewer is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_reviewer_id AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Only admins can review applications');
  END IF;

  -- Get vendor record
  SELECT * INTO vendor_record FROM vendors WHERE id = p_vendor_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Vendor application not found');
  END IF;

  -- Check if application is pending
  IF vendor_record.application_status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Application is not in pending status');
  END IF;

  -- Perform the review action
  IF p_action = 'approve' THEN
    -- Update vendor application status
    UPDATE vendors 
    SET 
      application_status = 'approved',
      application_reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      is_active = true,
      updated_at = now()
    WHERE id = p_vendor_id;
    
    -- Also update the user's profile to reflect vendor role
    UPDATE profiles
    SET role = 'vendor',
        updated_at = now()
    WHERE id = vendor_record.user_id;
    
    RETURN json_build_object('success', true, 'message', 'Vendor application approved successfully');
    
  ELSIF p_action = 'reject' THEN
    -- Update vendor application status to rejected
    UPDATE vendors 
    SET 
      application_status = 'rejected',
      application_reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      rejection_reason = p_rejection_reason,
      updated_at = now()
    WHERE id = p_vendor_id;
    
    RETURN json_build_object('success', true, 'message', 'Vendor application rejected');
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action. Use "approve" or "reject"');
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.review_vendor_application TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.review_vendor_application IS 'Allows admins to approve or reject vendor applications and update user roles accordingly';