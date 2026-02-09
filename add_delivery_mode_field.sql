-- Add delivery_mode field to vendors table
-- Run this in Supabase SQL Editor

-- Add the delivery_mode column with default value
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'agent_delivery' CHECK (delivery_mode IN ('self_delivery', 'pickup_only', 'agent_delivery', 'both'));

-- Add delivery_fee_self column for self delivery fees
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS delivery_fee_self numeric DEFAULT 0;

-- Add allow_agent_delivery column for BOTH mode
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS allow_agent_delivery boolean DEFAULT true;

-- Update existing vendors with default values
UPDATE vendors SET delivery_mode = 'agent_delivery' WHERE delivery_mode IS NULL;

-- Add delivery_handler column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_handler text DEFAULT 'agent' CHECK (delivery_handler IN ('vendor', 'agent'));

-- Update the delivery_option check constraint to allow new values if needed
-- The existing constraint is: delivery_option IN ('offers_hostel_delivery', 'does_not_offer_hostel_delivery')

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vendors' 
AND column_name IN ('delivery_mode', 'delivery_fee_self', 'allow_agent_delivery');
