-- Add max_discount column to promo_codes table if it doesn't exist
DO $$
BEGIN
  -- Check if max_discount column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'promo_codes' 
    AND column_name = 'max_discount'
  ) THEN
    -- Add the max_discount column
    ALTER TABLE promo_codes ADD COLUMN max_discount decimal(10, 2);
    RAISE NOTICE 'max_discount column added to promo_codes table';
  ELSE
    RAISE NOTICE 'max_discount column already exists in promo_codes table';
  END IF;
END $$;