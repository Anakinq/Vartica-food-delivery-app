-- Create agent_payout_profiles table
CREATE TABLE IF NOT EXISTS agent_payout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  account_number text NOT NULL,
  bank_code text NOT NULL,
  bank_name text,
  account_name text,
  recipient_code text, -- Paystack transfer recipient code
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_payout_profiles ENABLE ROW LEVEL SECURITY;

-- Agent can view and manage own payout profile
CREATE POLICY "Agents can view own payout profile"
  ON agent_payout_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Agents can insert own payout profile"
  ON agent_payout_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can update own payout profile"
  ON agent_payout_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can view all payout profiles
CREATE POLICY "Admin can view all payout profiles"
  ON agent_payout_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create agent_withdrawals table
CREATE TABLE IF NOT EXISTS agent_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transfer_code text, -- Paystack transfer code
  type text DEFAULT 'withdrawal' CHECK (type IN ('withdrawal', 'earnings')),
  reference text,
  failure_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agent_withdrawals ENABLE ROW LEVEL SECURITY;

-- Agent can view own withdrawals
CREATE POLICY "Agents can view own withdrawals"
  ON agent_withdrawals FOR SELECT
  TO authenticated
  USING (agent_id = auth.uid());

-- Agent can create own withdrawals
CREATE POLICY "Agents can create own withdrawals"
  ON agent_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (agent_id = auth.uid());

-- Admin can view all withdrawals
CREATE POLICY "Admin can view all withdrawals"
  ON agent_withdrawals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update all withdrawals
CREATE POLICY "Admin can update all withdrawals"
  ON agent_withdrawals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_payout_profiles_user ON agent_payout_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_agent ON agent_withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_status ON agent_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_created ON agent_withdrawals(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_agent_payout_profiles_updated_at
  BEFORE UPDATE ON agent_payout_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_withdrawals_updated_at
  BEFORE UPDATE ON agent_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
