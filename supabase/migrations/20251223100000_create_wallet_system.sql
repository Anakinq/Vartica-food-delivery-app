-- Create agent_wallets table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES delivery_agents(id) ON DELETE CASCADE,
  food_wallet_balance NUMERIC(10,2) DEFAULT 0.00,
  earnings_wallet_balance NUMERIC(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create agent_payout_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_payout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid UNIQUE REFERENCES delivery_agents(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create withdrawals table if it doesn't exist
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES delivery_agents(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  paystack_transfer_code TEXT,
  paystack_transfer_reference TEXT,
  error_message TEXT,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create wallet_transactions table for audit trail if it doesn't exist
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES delivery_agents(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'withdrawal', 'order_payment', 'platform_fee', 'agent_earnings')),
  amount NUMERIC(10,2) NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('food_wallet', 'earnings_wallet')),
  reference_type TEXT CHECK (reference_type IN ('order', 'withdrawal', 'adjustment')),
  reference_id TEXT,
  description TEXT,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on tables if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_wallets') THEN
    ALTER TABLE agent_wallets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_payout_profiles') THEN
    ALTER TABLE agent_payout_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals') THEN
    ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions') THEN
    ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent_id ON agent_wallets(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_agent_id ON withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_agent_id ON wallet_transactions(agent_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_agent_wallets_updated_at
  BEFORE UPDATE ON agent_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_payout_profiles_updated_at
  BEFORE UPDATE ON agent_payout_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Policies for agent_wallets if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_wallets' AND policyname = 'Agents can view their own wallet') THEN
    CREATE POLICY "Agents can view their own wallet" ON agent_wallets
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = agent_wallets.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_wallets' AND policyname = 'Agents can update their own wallet') THEN
    CREATE POLICY "Agents can update their own wallet" ON agent_wallets
      FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = agent_wallets.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = agent_wallets.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Policies for agent_payout_profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_payout_profiles' AND policyname = 'Agents can view their own payout profile') THEN
    CREATE POLICY "Agents can view their own payout profile" ON agent_payout_profiles
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = agent_payout_profiles.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agent_payout_profiles' AND policyname = 'Agents can manage their own payout profile') THEN
    CREATE POLICY "Agents can manage their own payout profile" ON agent_payout_profiles
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = agent_payout_profiles.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Policies for withdrawals if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Agents can view their own withdrawals') THEN
    CREATE POLICY "Agents can view their own withdrawals" ON withdrawals
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = withdrawals.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Agents can create their own withdrawals') THEN
    CREATE POLICY "Agents can create their own withdrawals" ON withdrawals
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = withdrawals.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Policies for wallet_transactions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wallet_transactions' AND policyname = 'Agents can view their own wallet transactions') THEN
    CREATE POLICY "Agents can view their own wallet transactions" ON wallet_transactions
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM delivery_agents 
        WHERE delivery_agents.id = wallet_transactions.agent_id 
        AND delivery_agents.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Create function to initialize wallet when delivery agent is created
CREATE OR REPLACE FUNCTION create_agent_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_wallets (agent_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create wallet when delivery agent is created if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'create_agent_wallet_trigger') THEN
    CREATE TRIGGER create_agent_wallet_trigger
      AFTER INSERT ON delivery_agents
      FOR EACH ROW
      EXECUTE FUNCTION create_agent_wallet();
  END IF;
END $$;

-- Create function for wallet credit/debit operations
CREATE OR REPLACE FUNCTION update_agent_wallet(
  p_agent_id UUID,
  p_wallet_type TEXT,
  p_amount NUMERIC,
  p_transaction_type TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  update_column TEXT;
BEGIN
  -- Determine which column to update based on wallet type
  IF p_wallet_type = 'food_wallet' THEN
    update_column := 'food_wallet_balance';
  ELSIF p_wallet_type = 'earnings_wallet' THEN
    update_column := 'earnings_wallet_balance';
  ELSE
    RAISE EXCEPTION 'Invalid wallet type: %', p_wallet_type;
  END IF;

  -- Update the wallet balance
  EXECUTE format('UPDATE agent_wallets SET %I = %I + $1 WHERE agent_id = $2', 
                 update_column, update_column)
  USING p_amount, p_agent_id;

  -- Log the transaction
  INSERT INTO wallet_transactions (
    agent_id, 
    transaction_type, 
    amount, 
    wallet_type, 
    reference_type, 
    reference_id, 
    description
  ) VALUES (
    p_agent_id,
    p_transaction_type,
    p_amount,
    p_wallet_type,
    p_reference_type,
    p_reference_id,
    p_description
  );
END;
$$ LANGUAGE plpgsql;