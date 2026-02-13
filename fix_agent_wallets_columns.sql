-- Add missing columns to agent_wallets table
-- Run this in Supabase SQL Editor if you want wallet tracking features

-- Add pending_withdrawal column
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS pending_withdrawal DECIMAL(10, 2) DEFAULT 0 CHECK (pending_withdrawal >= 0);

-- Add total_withdrawals column
ALTER TABLE agent_wallets ADD COLUMN IF NOT EXISTS total_withdrawals DECIMAL(10, 2) DEFAULT 0 CHECK (total_withdrawals >= 0);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_wallets' 
ORDER BY ordinal_position;
