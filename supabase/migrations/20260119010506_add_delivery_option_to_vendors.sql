-- Add delivery_option column to vendors table

-- Add the delivery_option column to the vendors table
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS delivery_option TEXT DEFAULT 'offers_hostel_delivery' 
CHECK (delivery_option IN ('offers_hostel_delivery', 'does_not_offer_hostel_delivery'));

-- Update existing student vendors to have the default delivery option
UPDATE vendors 
SET delivery_option = 'offers_hostel_delivery' 
WHERE delivery_option IS NULL;