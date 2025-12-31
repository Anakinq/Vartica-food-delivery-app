-- Create delivery fee discount promo codes table

-- Create delivery_fee_discount_promo_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_fee_discount_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')), -- percentage or fixed amount
  discount_value NUMERIC(10,2) NOT NULL, -- percentage (0-100) or fixed amount
  min_order_value NUMERIC(10,2) DEFAULT 0, -- minimum order value to qualify
  max_discount NUMERIC(10,2), -- maximum discount that can be applied
  usage_limit INTEGER, -- max total uses
  used_count INTEGER DEFAULT 0, -- current usage count
  valid_from TIMESTAMPTZ DEFAULT NOW(), -- start date
  valid_until TIMESTAMPTZ, -- end date
  is_active BOOLEAN DEFAULT true,
  created_by uuid REFERENCES profiles(id), -- admin who created the code
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE delivery_fee_discount_promo_codes ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_fee_discount_promo_codes_code ON delivery_fee_discount_promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_delivery_fee_discount_promo_codes_active ON delivery_fee_discount_promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_fee_discount_promo_codes_validity ON delivery_fee_discount_promo_codes(valid_from, valid_until);

-- Create policies for the table
-- Admins can manage all delivery fee discount promo codes
CREATE POLICY "Admins can manage all delivery fee discount promo codes" ON delivery_fee_discount_promo_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Anyone can view active and valid delivery fee discount promo codes
CREATE POLICY "Anyone can view active and valid delivery fee discount promo codes" ON delivery_fee_discount_promo_codes
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND now() >= valid_from
    AND (valid_until IS NULL OR now() <= valid_until)
    AND (usage_limit IS NULL OR used_count < usage_limit)
  );

-- Function to validate and apply delivery fee discount promo code
CREATE OR REPLACE FUNCTION validate_delivery_fee_discount_promo_code(
  p_code TEXT,
  p_order_total NUMERIC
) 
RETURNS TABLE(
  is_valid BOOLEAN,
  discount_amount NUMERIC,
  error_message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  promo_record RECORD;
  calculated_discount NUMERIC;
BEGIN
  -- Fetch the promo code record
  SELECT * INTO promo_record
  FROM delivery_fee_discount_promo_codes
  WHERE code = p_code
  AND is_active = true
  AND now() >= valid_from
  AND (valid_until IS NULL OR now() <= valid_until)
  AND (usage_limit IS NULL OR used_count < usage_limit);

  -- Check if promo code exists and is valid
  IF promo_record.id IS NULL THEN
    RETURN QUERY SELECT false, 0.00::NUMERIC, 'Invalid or expired promo code'::TEXT;
    RETURN;
  END IF;

  -- Check minimum order value
  IF p_order_total < promo_record.min_order_value THEN
    RETURN QUERY SELECT false, 0.00::NUMERIC, 'Order total does not meet minimum requirement for this promo code'::TEXT;
    RETURN;
  END IF;

  -- Calculate discount based on type
  IF promo_record.discount_type = 'percentage' THEN
    calculated_discount := p_order_total * (promo_record.discount_value / 100.0);
    -- Apply max discount cap if set
    IF promo_record.max_discount IS NOT NULL AND calculated_discount > promo_record.max_discount THEN
      calculated_discount := promo_record.max_discount;
    END IF;
  ELSIF promo_record.discount_type = 'fixed' THEN
    calculated_discount := promo_record.discount_value;
    -- Don't allow discount to exceed max discount if set
    IF promo_record.max_discount IS NOT NULL AND calculated_discount > promo_record.max_discount THEN
      calculated_discount := promo_record.max_discount;
    END IF;
  ELSE
    RETURN QUERY SELECT false, 0.00::NUMERIC, 'Invalid discount type'::TEXT;
    RETURN;
  END IF;

  -- Return success with calculated discount
  RETURN QUERY SELECT true, calculated_discount, NULL::TEXT;
END;
$$;

-- Function to increment usage count when a promo code is applied
CREATE OR REPLACE FUNCTION increment_promo_code_usage(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE delivery_fee_discount_promo_codes
  SET used_count = used_count + 1
  WHERE code = p_code;
END;
$$;