-- Create agent_wallets table
CREATE TABLE IF NOT EXISTS agent_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid UNIQUE REFERENCES delivery_agents(id) ON DELETE CASCADE,
  total_earnings decimal(10, 2) DEFAULT 0 CHECK (total_earnings >= 0),
  current_balance decimal(10, 2) DEFAULT 0 CHECK (current_balance >= 0),
  pending_withdrawal decimal(10, 2) DEFAULT 0 CHECK (pending_withdrawal >= 0),
  total_withdrawals decimal(10, 2) DEFAULT 0 CHECK (total_withdrawals >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;

-- Agents can view own wallet
CREATE POLICY "Agents can view own wallet"
  ON agent_wallets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_agents
      WHERE delivery_agents.id = agent_wallets.agent_id
      AND delivery_agents.user_id = auth.uid()
    )
  );

-- Admin can view all wallets
CREATE POLICY "Admin can view all wallets"
  ON agent_wallets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES delivery_agents(id) ON DELETE CASCADE,
  rider_name text NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Agents can view own withdrawal requests
CREATE POLICY "Agents can view own withdrawals"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_agents
      WHERE delivery_agents.id = withdrawal_requests.agent_id
      AND delivery_agents.user_id = auth.uid()
    )
  );

-- Agents can create own withdrawal requests
CREATE POLICY "Agents can create withdrawals"
  ON withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM delivery_agents
      WHERE delivery_agents.id = agent_id
      AND delivery_agents.user_id = auth.uid()
    )
  );

-- Admin can view all withdrawals
CREATE POLICY "Admin can view all withdrawal requests"
  ON withdrawal_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update withdrawal status
CREATE POLICY "Admin can update withdrawals"
  ON withdrawal_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add delivery_fee and agent_earning columns to orders if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee decimal(10, 2) DEFAULT 200;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_earning decimal(10, 2) DEFAULT 200;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent ON agent_wallets(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_agent ON withdrawal_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Create trigger for updated_at
CREATE TRIGGER update_agent_wallets_updated_at
  BEFORE UPDATE ON agent_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update agent wallet when order is delivered
CREATE OR REPLACE FUNCTION update_agent_wallet_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update wallet when status changes to 'delivered'
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.delivery_agent_id IS NOT NULL THEN
    -- Get or create wallet
    INSERT INTO agent_wallets (agent_id, total_earnings, current_balance)
    VALUES (NEW.delivery_agent_id, NEW.agent_earning, NEW.agent_earning)
    ON CONFLICT (agent_id) DO UPDATE
    SET
      total_earnings = agent_wallets.total_earnings + NEW.agent_earning,
      current_balance = agent_wallets.current_balance + NEW.agent_earning,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_update_agent_wallet ON orders;
CREATE TRIGGER trigger_update_agent_wallet
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_wallet_on_delivery();

-- Function to process withdrawal approval
CREATE OR REPLACE FUNCTION approve_withdrawal(
  p_withdrawal_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_withdrawal withdrawal_requests%ROWTYPE;
  v_wallet agent_wallets%ROWTYPE;
BEGIN
  -- Get withdrawal request
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal request not found or already processed');
  END IF;

  -- Get agent wallet
  SELECT * INTO v_wallet
  FROM agent_wallets
  WHERE agent_id = v_withdrawal.agent_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Agent wallet not found');
  END IF;

  -- Validate amount is positive
  IF v_withdrawal.amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid withdrawal amount');
  END IF;

  -- Check if balance is sufficient
  IF v_wallet.current_balance < v_withdrawal.amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET
    status = 'approved',
    approved_by = p_admin_id,
    approved_at = now()
  WHERE id = p_withdrawal_id;

  -- Update wallet
  UPDATE agent_wallets
  SET
    current_balance = current_balance - v_withdrawal.amount,
    pending_withdrawal = GREATEST(0, pending_withdrawal - v_withdrawal.amount),
    total_withdrawals = total_withdrawals + v_withdrawal.amount,
    updated_at = now()
  WHERE agent_id = v_withdrawal.agent_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
