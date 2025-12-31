-- Add customer hostel location field to orders table

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_hostel_location TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_hostel_location ON orders(customer_hostel_location);

-- Update RLS policies if needed (though existing policies should still work)