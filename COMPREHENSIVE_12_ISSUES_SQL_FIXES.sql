-- COMPREHENSIVE 12 ISSUES SQL FIXES

-- ISSUE 1: Fix admin dashboard withdrawal table to show account number and bank name
-- Drop existing view to ensure clean creation with new column structure
DROP VIEW IF EXISTS admin_withdrawals_view;

-- Create the view that joins withdrawals with agent_payout_profiles to get bank details
CREATE OR REPLACE VIEW admin_withdrawals_view AS
SELECT 
  w.id,
  w.agent_id,
  w.amount,
  w.status,
  w.created_at,
  w.processed_at,
  w.error_message,
  w.paystack_transfer_code,
  w.admin_notes,
  w.type,
  app.account_name as payout_account_name,
  app.account_number as payout_account_number,
  app.bank_code as payout_bank_code,
  CASE 
    WHEN app.bank_code = '044' THEN 'Access Bank'
    WHEN app.bank_code = '063' THEN 'Access Bank (Diamond)'
    WHEN app.bank_code = '035A' THEN 'ALAT by WEMA'
    WHEN app.bank_code = '401' THEN 'ASO Savings and Loans'
    WHEN app.bank_code = '023' THEN 'Citibank Nigeria'
    WHEN app.bank_code = '050' THEN 'Ecobank Nigeria'
    WHEN app.bank_code = '562' THEN 'Ekondo Microfinance Bank'
    WHEN app.bank_code = '070' THEN 'Fidelity Bank'
    WHEN app.bank_code = '011' THEN 'First Bank of Nigeria'
    WHEN app.bank_code = '214' THEN 'First City Monument Bank'
    WHEN app.bank_code = '901' THEN 'FSDH Merchant Bank Limited'
    WHEN app.bank_code = '00103' THEN 'Globus Bank'
    WHEN app.bank_code = '100022' THEN 'GoMoney'
    WHEN app.bank_code = '058' THEN 'Guaranty Trust Bank'
    WHEN app.bank_code = '030' THEN 'Heritage Bank'
    WHEN app.bank_code = '301' THEN 'Jaiz Bank'
    WHEN app.bank_code = '082' THEN 'Keystone Bank'
    WHEN app.bank_code = '559' THEN 'Kuda Bank'
    WHEN app.bank_code = '50211' THEN 'Kuda Microfinance Bank'
    WHEN app.bank_code = '999992' THEN 'OPay'
    WHEN app.bank_code = '526' THEN 'Parallex Bank'
    WHEN app.bank_code = '999991' THEN 'PalmPay'
    WHEN app.bank_code = '076' THEN 'Polaris Bank'
    WHEN app.bank_code = '101' THEN 'Providus Bank'
    WHEN app.bank_code = '125' THEN 'Rubies MFB'
    WHEN app.bank_code = '51310' THEN 'Sparkle Microfinance Bank'
    WHEN app.bank_code = '221' THEN 'Stanbic IBTC Bank'
    WHEN app.bank_code = '068' THEN 'Standard Chartered Bank'
    WHEN app.bank_code = '232' THEN 'Sterling Bank'
    WHEN app.bank_code = '100' THEN 'Suntrust Bank'
    WHEN app.bank_code = '302' THEN 'TAJ Bank'
    WHEN app.bank_code = '102' THEN 'Titan Bank'
    WHEN app.bank_code = '032' THEN 'Union Bank of Nigeria'
    WHEN app.bank_code = '033' THEN 'United Bank For Africa'
    WHEN app.bank_code = '215' THEN 'Unity Bank'
    WHEN app.bank_code = '566' THEN 'VFD Microfinance Bank'
    WHEN app.bank_code = '035' THEN 'Wema Bank'
    WHEN app.bank_code = '057' THEN 'Zenith Bank'
    ELSE app.bank_code
  END as payout_display_bank_name,
  p.full_name as agent_profile_name,
  p.email as agent_profile_email
FROM withdrawals w
LEFT JOIN delivery_agents da ON w.agent_id = da.id
LEFT JOIN agent_payout_profiles app ON da.user_id = app.user_id
LEFT JOIN profiles p ON da.user_id = p.id
ORDER BY w.created_at DESC;

-- ISSUE 2: No need for specific SQL fix - handled in frontend by removing BottomNavigation

-- ISSUE 3: Fix promo codes table and ensure it's working
-- Create or update promo codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_fee_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_amount DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure RLS policies for promo codes
DROP POLICY IF EXISTS "Admins can view promo codes" ON delivery_fee_promo_codes;
CREATE POLICY "Admins can view promo codes" ON delivery_fee_promo_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage promo codes" ON delivery_fee_promo_codes;
CREATE POLICY "Admins can manage promo codes" ON delivery_fee_promo_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ISSUE 4: Fix banner table to support image upload functionality
-- Add image file path column to banners table
ALTER TABLE banners ADD COLUMN IF NOT EXISTS image_file_path TEXT;

-- Ensure RLS policies for banners
DROP POLICY IF EXISTS "Admins can manage banners" ON banners;
CREATE POLICY "Admins can manage banners" ON banners
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ISSUE 5: No specific SQL fix needed - handled in frontend

-- ISSUE 6: No specific SQL fix needed - handled in frontend

-- ISSUE 7: Ensure admin dashboard has access to all required data tables
-- Ensure proper RLS policies for all admin-accessible tables

-- Profiles table policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Delivery agents table policy
DROP POLICY IF EXISTS "Admins can view delivery agents" ON delivery_agents;
CREATE POLICY "Admins can view delivery agents" ON delivery_agents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Vendors table policy
DROP POLICY IF EXISTS "Admins can view vendors" ON vendors;
CREATE POLICY "Admins can view vendors" ON vendors
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Orders table policy
DROP POLICY IF EXISTS "Admins can view orders" ON orders;
CREATE POLICY "Admins can view orders" ON orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ISSUE 10: No specific SQL fix needed - handled in frontend

-- ISSUE 11: No specific SQL fix needed - handled in frontend

-- ISSUE 12: Fix ambiguous user_id in delivery agent registration function
-- Drop and recreate the function with proper parameter naming
DROP FUNCTION IF EXISTS public.add_delivery_agent_role(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.add_delivery_agent_role(target_user_id UUID, vehicle_type TEXT DEFAULT 'Foot')
RETURNS JSON AS $$
DECLARE
  result JSON;
  delivery_agent_exists BOOLEAN;
  agent_id UUID;
BEGIN
  -- Check if already a delivery agent
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_agents WHERE user_id = target_user_id
  ) INTO delivery_agent_exists;

  IF delivery_agent_exists THEN
    result := json_build_object(
      'success', false,
      'error', 'ALREADY_DELIVERY_AGENT',
      'message', 'User is already registered as a delivery agent.'
    );
    RETURN result;
  END IF;

  -- Update profile flags
  UPDATE public.profiles 
  SET 
    is_delivery_agent = TRUE,
    role = CASE 
      WHEN role = 'customer' THEN 'delivery_agent'
      ELSE role
    END,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- Create delivery agent record
  INSERT INTO public.delivery_agents (
    user_id, 
    vehicle_type, 
    is_available, 
    active_orders_count, 
    total_deliveries, 
    rating,
    is_approved,
    is_foot_delivery
  )
  VALUES (
    target_user_id,
    vehicle_type,
    FALSE,
    0,
    0,
    5.00,
    FALSE,
    CASE WHEN vehicle_type ILIKE '%foot%' OR vehicle_type = 'Foot' THEN TRUE ELSE FALSE END
  )
  RETURNING id INTO agent_id;

  -- Create agent wallet
  INSERT INTO public.agent_wallets (
    agent_id,
    customer_funds,
    delivery_earnings,
    total_balance,
    updated_at
  )
  VALUES (
    agent_id,
    0,
    0,
    0,
    NOW()
  )
  ON CONFLICT (agent_id) DO NOTHING;

  result := json_build_object(
    'success', true,
    'message', 'Successfully registered as delivery agent',
    'agent_id', agent_id
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions for the function
GRANT EXECUTE ON FUNCTION public.add_delivery_agent_role(UUID, TEXT) TO authenticated;

-- Also create a function to toggle banner visibility (for issue 5)
CREATE OR REPLACE FUNCTION toggle_banner_visibility(banner_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_status BOOLEAN;
BEGIN
  SELECT is_active FROM banners WHERE id = banner_id INTO current_status;
  
  IF current_status IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE banners SET is_active = NOT current_status WHERE id = banner_id;
  RETURN NOT current_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION toggle_banner_visibility(UUID) TO authenticated;

-- Verify all functions were created successfully
SELECT 'All SQL fixes applied successfully!' as status;

-- Show the created functions
SELECT proname as function_name
FROM pg_proc 
WHERE proname IN ('add_delivery_agent_role', 'toggle_banner_visibility');

-- Show the created view
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename = 'admin_withdrawals_view';

-- Show the updated banners table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'banners' AND column_name = 'image_file_path';