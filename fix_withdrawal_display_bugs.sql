-- Fix for withdrawal display bugs
-- 1. Ensure agent_wallets has proper columns
-- 2. Ensure withdrawals table has proper type column

-- Add missing columns to agent_wallets if they don't exist
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS food_wallet_balance DECIMAL(10,2) DEFAULT 0;

ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS earnings_wallet_balance DECIMAL(10,2) DEFAULT 0;

-- Add pending_withdrawal column for tracking pending withdrawals
ALTER TABLE agent_wallets 
ADD COLUMN IF NOT EXISTS pending_withdrawal DECIMAL(10,2) DEFAULT 0;

-- Ensure withdrawals table has the type column
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'earnings';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_withdrawals_agent_status 
ON withdrawals(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_withdrawals_type 
ON withdrawals(type);

-- Grant permissions
GRANT ALL ON agent_wallets TO authenticated;
GRANT ALL ON withdrawals TO authenticated;

-- Update existing withdrawals that might have null type
UPDATE withdrawals 
SET type = 'earnings' 
WHERE type IS NULL OR type = '';

-- Ensure wallet triggers are enabled
DROP TRIGGER IF EXISTS trigger_credit_wallet_on_accept ON orders;
CREATE TRIGGER trigger_credit_wallet_on_accept
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION credit_wallet_on_order_accept();

-- Grant execute on the function
GRANT EXECUTE ON FUNCTION credit_wallet_on_order_accept() TO authenticated;

-- Verify the update_agent_wallet function exists and works
CREATE OR REPLACE FUNCTION update_agent_wallet(
  p_agent_id UUID,
  p_wallet_type TEXT,
  p_amount DECIMAL(10,2),
  p_transaction_type TEXT,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT
)
RETURNS VOID AS $$
DECLARE
  update_column TEXT;
BEGIN
  -- Determine which column to update
  CASE p_wallet_type
    WHEN 'food_wallet' THEN
      update_column := 'food_wallet_balance';
    WHEN 'earnings_wallet' THEN
      update_column := 'earnings_wallet_balance';
    WHEN 'pending_withdrawal' THEN
      update_column := 'pending_withdrawal';
    ELSE
      RAISE EXCEPTION 'Invalid wallet type: %', p_wallet_type;
  END CASE;

  -- Check if wallet exists, create if not
  IF NOT EXISTS (SELECT 1 FROM agent_wallets WHERE agent_id = p_agent_id) THEN
    INSERT INTO agent_wallets (agent_id, food_wallet_balance, earnings_wallet_balance)
    VALUES (p_agent_id, 0, 0);
  END IF;

  -- For credit transactions, add the amount
  -- For debit transactions, subtract the amount
  IF p_transaction_type = 'credit' THEN
    EXECUTE format(
      'UPDATE agent_wallets SET %I = COALESCE(%I, 0) + $1 WHERE agent_id = $2',
      update_column, update_column
    ) USING p_amount, p_agent_id;
  ELSE
    EXECUTE format(
      'UPDATE agent_wallets SET %I = COALESCE(%I, 0) - $1 WHERE agent_id = $2',
      update_column, update_column
    ) USING p_amount, p_agent_id;
  END IF;

  -- Insert transaction record
  INSERT INTO wallet_transactions (
    agent_id,
    wallet_type,
    amount,
    transaction_type,
    reference_type,
    reference_id,
    description
  ) VALUES (
    p_agent_id,
    p_wallet_type,
    p_amount,
    p_transaction_type,
    p_reference_type,
    p_reference_id,
    p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_agent_wallet(
  UUID,
  TEXT,
  DECIMAL(10,2),
  TEXT,
  TEXT,
  UUID,
  TEXT
) TO authenticated;

-- Create wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES delivery_agents(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for agents to view their own transactions
DROP POLICY IF EXISTS "Agents can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Agents can view own wallet transactions" ON wallet_transactions
  FOR SELECT TO authenticated
  USING (
    agent_id IN (SELECT id FROM delivery_agents WHERE user_id = auth.uid())
  );

-- Create indexes
DROP INDEX IF EXISTS idx_wallet_transactions_agent_id;
DROP INDEX IF EXISTS idx_wallet_transactions_created_at;
CREATE INDEX idx_wallet_transactions_agent_id ON wallet_transactions(agent_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Display current state
SELECT 'agent_wallets table columns:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_wallets';

SELECT 'withdrawals table columns:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'withdrawals';

SELECT 'Sample wallet data:' as info, * FROM agent_wallets LIMIT 5;
SELECT 'Sample withdrawal data:' as info, * FROM withdrawals LIMIT 5;
