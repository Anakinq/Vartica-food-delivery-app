-- Add 'type' column to withdrawals table to fix 500 error
-- The API expects a 'type' column but the table only has 'withdrawal_type'

-- Option B: Add type column with default and check constraint

-- Add the column with a default value
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS type varchar DEFAULT 'earnings';

-- Add check constraint to validate values (matching existing withdrawal_type values)
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_type_check;
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_type_check 
CHECK (type::text = ANY (ARRAY['earnings'::text, 'food'::text, 'customer_funds'::text, 'delivery_earnings'::text, 'food_wallet'::text]));

-- Update existing records to have matching type values (copy from withdrawal_type if not default)
UPDATE public.withdrawals 
SET type = withdrawal_type 
WHERE type IS NULL OR type = 'earnings';

-- Grant necessary permissions
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT SELECT ON public.withdrawals TO anon;
GRANT SELECT, INSERT, UPDATE ON public.withdrawals TO service_role;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'withdrawals' AND table_schema = 'public' 
AND column_name IN ('type', 'withdrawal_type');
