-- Migration: Credit delivery agent wallet when order is accepted
-- This implements the ESCROW model: money is held until agent accepts the order
-- Then the wallet is credited automatically via database trigger

-- Function to credit wallet when order is accepted
CREATE OR REPLACE FUNCTION credit_wallet_on_order_accept()
RETURNS TRIGGER AS $$
DECLARE
  v_food_amount DECIMAL(10,2);
  v_delivery_amount DECIMAL(10,2);
  v_vendor_id UUID;
BEGIN
  -- Only process if status changed to 'accepted' and payment is 'paid'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.payment_status = 'paid' THEN
    -- Get order details
    v_food_amount := COALESCE(NEW.subtotal, 0);
    v_delivery_amount := COALESCE(NEW.delivery_fee, 0);
    v_vendor_id := NEW.vendor_id;
    
    -- Credit food wallet (vendor's share)
    IF v_food_amount > 0 THEN
      PERFORM update_agent_wallet(
        NEW.delivery_agent_id,
        'food_wallet',
        v_food_amount,
        'credit',
        'order_payment',
        NEW.id,
        'Food payment for order ' || NEW.order_number
      );
    END IF;
    
    -- Credit earnings wallet (delivery agent's earnings from delivery fee)
    IF v_delivery_amount > 0 THEN
      PERFORM update_agent_wallet(
        NEW.delivery_agent_id,
        'earnings_wallet',
        v_delivery_amount,
        'credit',
        'order_payment',
        NEW.id,
        'Delivery fee for order ' || NEW.order_number
      );
    END IF;
    
    -- Log the credit
    RAISE NOTICE 'Wallet credited for order %: food=%, delivery=%', 
      NEW.order_number, v_food_amount, v_delivery_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_credit_wallet_on_accept ON orders;

-- Create trigger to credit wallet when order is accepted
CREATE TRIGGER trigger_credit_wallet_on_accept
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION credit_wallet_on_order_accept();

-- Grant execute permission to authenticated users (via supabase)
GRANT EXECUTE ON FUNCTION credit_wallet_on_order_accept() TO authenticated;

-- Note: The update_agent_wallet function should already exist from the wallet system
-- If not, here's the key part - it needs to handle 'food_wallet' and 'earnings_wallet' wallet types

-- Verify/update the update_agent_wallet function to support both wallet types
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
    WHEN 'total_withdrawals' THEN
      update_column := 'total_withdrawals';
    ELSE
      RAISE EXCEPTION 'Invalid wallet type: %', p_wallet_type;
  END CASE;

  -- Check if wallet exists
  IF NOT EXISTS (SELECT 1 FROM agent_wallets WHERE agent_id = p_agent_id) THEN
    INSERT INTO agent_wallets (agent_id) VALUES (p_agent_id);
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
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_agent_id ON wallet_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
