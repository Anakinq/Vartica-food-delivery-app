-- Add delivery_fee_discount column to orders table

-- Add the column to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_fee_discount decimal(10, 2) DEFAULT 0 CHECK (delivery_fee_discount >= 0);

-- Update the check constraint on total to account for delivery fee discount
-- The total should be >= (subtotal + delivery_fee - delivery_fee_discount - discount)
-- Since we can't create a complex check constraint that references other columns directly in the same table,
-- we'll rely on the application logic to ensure this relationship holds