-- Create vendor_payout_profiles table for bank account management
CREATE TABLE IF NOT EXISTS vendor_payout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  account_number VARCHAR(10) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  paystack_recipient_code VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendor_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_payout_profiles_vendor_id ON vendor_payout_profiles(vendor_id);

-- Create vendor_withdrawals table for tracking withdrawal requests
CREATE TABLE IF NOT EXISTS vendor_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  paystack_transfer_code VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_withdrawals_vendor_id ON vendor_withdrawals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_withdrawals_status ON vendor_withdrawals(status);

-- Create vendor_wallet_transactions table for transaction history
CREATE TABLE IF NOT EXISTS vendor_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'withdrawal')),
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  description TEXT,
  reference_id VARCHAR(255),
  reference_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_wallet_transactions_vendor_id ON vendor_wallet_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_wallet_transactions_created_at ON vendor_wallet_transactions(created_at DESC);

-- Enable Row Level Security for vendor_payout_profiles
ALTER TABLE vendor_payout_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Vendors can only view their own payout profile
CREATE POLICY "Vendors can view own payout profile" ON vendor_payout_profiles
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Policy: Vendors can insert their own payout profile
CREATE POLICY "Vendors can insert own payout profile" ON vendor_payout_profiles
  FOR INSERT
  WITH CHECK (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Policy: Vendors can update their own payout profile
CREATE POLICY "Vendors can update own payout profile" ON vendor_payout_profiles
  FOR UPDATE
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Enable Row Level Security for vendor_withdrawals
ALTER TABLE vendor_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policy: Vendors can only view their own withdrawals
CREATE POLICY "Vendors can view own withdrawals" ON vendor_withdrawals
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Policy: Admin can view all withdrawals
CREATE POLICY "Admin can view all withdrawals" ON vendor_withdrawals
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Enable Row Level Security for vendor_wallet_transactions
ALTER TABLE vendor_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Vendors can only view their own transactions
CREATE POLICY "Vendors can view own transactions" ON vendor_wallet_transactions
  FOR SELECT
  USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid()));

-- Create RPC function to update vendor wallet
CREATE OR REPLACE FUNCTION update_vendor_wallet(
  p_vendor_id UUID,
  p_amount DECIMAL,
  p_transaction_type VARCHAR,
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_balance DECIMAL;
  new_balance DECIMAL;
  new_withdrawn DECIMAL;
BEGIN
  -- Get current wallet info
  SELECT total_earnings, withdrawn_earnings INTO current_balance, new_withdrawn
  FROM vendor_wallets
  WHERE vendor_id = p_vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vendor wallet not found';
  END IF;

  -- Calculate new balance
  IF p_transaction_type = 'credit' THEN
    new_balance := current_balance + p_amount;
  ELSIF p_transaction_type = 'debit' THEN
    new_balance := current_balance - p_amount;
    new_withdrawn := new_withdrawn + p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  -- Update wallet
  UPDATE vendor_wallets
  SET 
    total_earnings = new_balance,
    withdrawn_earnings = new_withdrawn,
    updated_at = NOW()
  WHERE vendor_id = p_vendor_id;

  -- Record transaction
  INSERT INTO vendor_wallet_transactions (
    vendor_id,
    order_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_id,
    reference_type
  ) VALUES (
    p_vendor_id,
    p_reference_id,
    p_transaction_type,
    p_amount,
    current_balance,
    new_balance,
    p_description,
    p_reference_id,
    p_reference_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
