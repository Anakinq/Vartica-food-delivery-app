-- Add platform_commission and agent_earnings columns to orders table

-- Add the platform_commission column to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS platform_commission decimal(10, 2) DEFAULT 0 CHECK (platform_commission >= 0);

-- Add the agent_earnings column to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS agent_earnings decimal(10, 2) DEFAULT 0 CHECK (agent_earnings >= 0);

-- Update the total calculation to include platform commission
-- We need to adjust the check constraint to allow for platform commission
-- Since we can't easily modify the existing constraint to include platform commission in the calculation,
-- we'll rely on application logic to ensure proper total calculations