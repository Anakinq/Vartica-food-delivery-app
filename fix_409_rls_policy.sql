-- Fix 409 Conflict error by updating RLS policies on orders table
-- The app sends user_id but the policy checks customer_id, causing insert failure

-- ============================================
-- STEP 1: Add user_id column if it doesn't exist (for backward compatibility)
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ============================================
-- STEP 2: Update existing orders to sync user_id = customer_id where user_id is null
-- ============================================
UPDATE orders SET user_id = customer_id WHERE user_id IS NULL AND customer_id IS NOT NULL;

-- ============================================
-- STEP 3: Drop and recreate the "Customers can create orders" policy to check both user_id and customer_id
-- ============================================
DROP POLICY IF EXISTS "Customers can create orders" ON orders;

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM profiles WHERE id = customer_id
    )
    OR 
    user_id = auth.uid()
    OR 
    customer_id = auth.uid()
  );

-- ============================================
-- STEP 4: Update "Customers can view own orders" policy to check both columns
-- ============================================
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;

CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    customer_id = auth.uid()
  );

-- ============================================
-- STEP 5: Update other policies that might reference customer_id or user_id
-- ============================================

-- Check if delivery agent policies need updating
-- These should still work as they reference delivery_agent_id

-- ============================================
-- STEP 6: Grant proper permissions
-- ============================================

-- Ensure users can insert orders with either user_id or customer_id
GRANT INSERT (order_number, user_id, customer_id, seller_id, seller_type, delivery_agent_id, status, 
              subtotal, delivery_fee, delivery_fee_discount, discount, total, payment_method, 
              payment_status, payment_reference, promo_code, delivery_address, delivery_notes, 
              scheduled_for, platform_commission, agent_earnings, delivery_handler) 
ON orders TO authenticated;

GRANT SELECT, UPDATE ON orders TO authenticated;

-- ============================================
-- STEP 7: Create index on user_id for performance if not exists
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- ============================================
-- Verification query - run this in Supabase SQL editor to check policies
-- ============================================
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'orders';
