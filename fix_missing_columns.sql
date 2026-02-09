-- Fix missing columns in orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_handler TEXT DEFAULT 'agent';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_earnings DECIMAL(10,2) DEFAULT 0;

-- Fix missing columns in agent_wallets table
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS food_wallet_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS earnings_wallet_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS pending_withdrawal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS total_withdrawals DECIMAL(10,2) DEFAULT 0;

-- Fix missing columns in withdrawals table
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_delivery_handler ON orders(delivery_handler);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_agent_id ON orders(delivery_agent_id);

-- Update existing orders to set customer_id from user_id if needed
UPDATE orders SET customer_id = user_id WHERE customer_id IS NULL AND user_id IS NOT NULL;

-- Update existing orders to set delivery_handler
UPDATE orders SET delivery_handler = 'agent' WHERE delivery_handler IS NULL;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_wallets' 
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'withdrawals' 
ORDER BY ordinal_position;
