-- Vartica Food Delivery - Vendor Database Setup
-- Run this in your Supabase SQL Editor

-- ============================================
-- VENDOR REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, order_id)
);

-- Enable RLS for vendor_reviews
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_reviews
CREATE POLICY "Anyone can view vendor reviews" ON vendor_reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON vendor_reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own reviews" ON vendor_reviews
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete their own reviews" ON vendor_reviews
  FOR DELETE USING (auth.uid() = customer_id);

-- ============================================
-- VENDOR WALLETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  total_earnings DECIMAL(12, 2) DEFAULT 0.00,
  pending_earnings DECIMAL(12, 2) DEFAULT 0.00,
  withdrawn_earnings DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id)
);

-- Enable RLS for vendor_wallets
ALTER TABLE vendor_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_wallets
CREATE POLICY "Vendors can view their own wallet" ON vendor_wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all wallets" ON vendor_wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- VENDOR WALLET TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'withdrawal', 'refund')),
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) DEFAULT 0.00,
  balance_after DECIMAL(12, 2) DEFAULT 0.00,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for vendor_wallet_transactions
ALTER TABLE vendor_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_wallet_transactions
CREATE POLICY "Vendors can view their own transactions" ON vendor_wallet_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can view all transactions" ON vendor_wallet_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- VENDOR WITHDRAWALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  paystack_transfer_code TEXT,
  paystack_reference TEXT,
  error_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for vendor_withdrawals
ALTER TABLE vendor_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_withdrawals
CREATE POLICY "Vendors can view their own withdrawals" ON vendor_withdrawals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all withdrawals" ON vendor_withdrawals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- VENDOR PAYOUT PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_payout_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id),
  UNIQUE(user_id)
);

-- Enable RLS for vendor_payout_profiles
ALTER TABLE vendor_payout_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_payout_profiles
CREATE POLICY "Vendors can manage their own payout profile" ON vendor_payout_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM vendors WHERE id = vendor_id AND user_id = auth.uid())
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to credit vendor wallet
CREATE OR REPLACE FUNCTION credit_vendor_wallet(
  p_vendor_id UUID,
  p_order_id UUID,
  p_amount DECIMAL,
  p_description TEXT
)
RETURNS void AS $$
DECLARE
  v_wallet_id UUID;
  v_balance_before DECIMAL;
  v_balance_after DECIMAL;
BEGIN
  -- Get or create wallet
  SELECT id, COALESCE(total_earnings, 0) INTO v_wallet_id, v_balance_before
  FROM vendor_wallets
  WHERE vendor_id = p_vendor_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO vendor_wallets (vendor_id, total_earnings, pending_earnings)
    VALUES (p_vendor_id, 0, p_amount)
    RETURNING id INTO v_wallet_id;
    v_balance_before := 0;
  ELSE
    UPDATE vendor_wallets
    SET pending_earnings = pending_earnings + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;
  END IF;
  
  v_balance_after := v_balance_before + p_amount;
  
  -- Record transaction
  INSERT INTO vendor_wallet_transactions (
    vendor_id, order_id, transaction_type, amount,
    balance_before, balance_after, description
  )
  VALUES (
    p_vendor_id, p_order_id, 'credit', p_amount,
    v_balance_before, v_balance_after, p_description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release pending earnings (called when order is delivered)
CREATE OR REPLACE FUNCTION release_vendor_earnings(
  p_order_id UUID
)
RETURNS void AS $$
DECLARE
  v_order RECORD;
  v_vendor_id UUID;
  v_vendor_earnings DECIMAL;
  v_platform_commission DECIMAL;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  v_vendor_id := v_order.seller_id;
  v_platform_commission := COALESCE(v_order.platform_commission, 200);
  v_vendor_earnings := v_order.total - v_platform_commission;
  
  -- Credit vendor wallet
  PERFORM credit_vendor_wallet(
    v_vendor_id,
    p_order_id,
    v_vendor_earnings,
    'Earnings from order ' || v_order.order_number
  );
  
  -- Move from pending to total
  UPDATE vendor_wallets
  SET total_earnings = total_earnings + v_vendor_earnings,
      pending_earnings = pending_earnings - v_vendor_earnings,
      updated_at = NOW()
  WHERE vendor_id = v_vendor_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER TO AUTO-CREATE VENDOR WALLET
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_vendor_wallet()
RETURNS trigger AS $$
BEGIN
  INSERT INTO vendor_wallets (vendor_id)
  VALUES (new.id)
  ON CONFLICT (vendor_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create wallet when vendor is created
DROP TRIGGER IF EXISTS trigger_auto_create_vendor_wallet ON vendors;
CREATE TRIGGER trigger_auto_create_vendor_wallet
  AFTER INSERT ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_vendor_wallet();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor ON vendor_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_customer ON vendor_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_order ON vendor_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_wallet_transactions_vendor ON vendor_wallet_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_wallet_transactions_created ON vendor_wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_withdrawals_vendor ON vendor_withdrawals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_withdrawals_status ON vendor_withdrawals(status);

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================
-- This will only work if you have existing vendors
/*
INSERT INTO vendor_wallets (vendor_id)
SELECT id FROM vendors
WHERE NOT EXISTS (SELECT 1 FROM vendor_wallets WHERE vendor_id = vendors.id);
*/
