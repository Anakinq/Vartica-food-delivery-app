-- ============================================================================
-- CAFETERIA ORDER FIX
-- 
-- This script fixes the following issues:
-- 1. Order creation fails - no profile for cafeteria users (FK violation)
-- 2. 400 Bad Request - code uses 'ready_for_pickup' but DB has 'ready'
-- 3. Agent earnings not credited automatically
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- FIX 1: Create profiles for all cafeterias (quick fix for immediate relief)
-- ============================================================================

INSERT INTO public.profiles (id, role, full_name, email)
SELECT 
  c.user_id, 
  'cafeteria' as role,
  c.name as full_name,
  CONCAT(LOWER(REPLACE(c.name, ' ', '_')), '@cafeteria.vartica.com') as email
FROM public.cafeterias c
LEFT JOIN public.profiles p ON c.user_id = p.id
WHERE c.user_id IS NOT NULL AND p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify profiles were created
SELECT 
  c.id as cafeteria_id,
  c.name as cafeteria_name,
  c.user_id,
  p.id as profile_id,
  p.role,
  p.full_name
FROM public.cafeterias c
LEFT JOIN public.profiles p ON c.user_id = p.id
ORDER BY c.name;

-- ============================================================================
-- FIX 2: Ensure agent earnings are credited automatically on delivery
-- ============================================================================

-- Drop existing function and trigger (using CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.credit_agent_on_delivery() CASCADE;

-- Create function to credit delivery agent when order is delivered
CREATE OR REPLACE FUNCTION public.credit_agent_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  agent_earning NUMERIC;
BEGIN
  -- Only trigger on delivery
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Get agent earnings from the order
    SELECT COALESCE(NEW.agent_earnings, 0) INTO agent_earning;
    
    IF agent_earning > 0 AND NEW.delivery_agent_id IS NOT NULL THEN
      -- Update agent wallet/earnings
      UPDATE public.delivery_agents
      SET 
        delivery_earnings = COALESCE(delivery_earnings, 0) + agent_earning,
        total_deliveries = total_deliveries + 1,
        active_orders_count = GREATEST(0, active_orders_count - 1)
      WHERE id = NEW.delivery_agent_id;
      
      -- Record transaction
      INSERT INTO public.wallet_transactions (
        agent_id, transaction_type, amount, wallet_type, 
        reference_type, reference_id, description
      ) VALUES (
        NEW.delivery_agent_id, 'credit', agent_earning, 'earnings_wallet',
        'order', NEW.id, E'Delivery earnings for order: ' || NEW.order_number
      );
    END IF;
  END IF;
  
  -- Handle order acceptance (increment active count)
  IF NEW.status = 'accepted' AND OLD.status = 'pending' AND NEW.delivery_agent_id IS NOT NULL THEN
    UPDATE public.delivery_agents
    SET active_orders_count = active_orders_count + 1
    WHERE id = NEW.delivery_agent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_credit_agent_on_delivery ON public.orders;
CREATE TRIGGER trigger_credit_agent_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_agent_on_delivery();

-- ============================================================================
-- FIX 3: Add 'ready_for_pickup' status to orders if needed
-- The frontend code expects 'ready_for_pickup' but DB has 'ready'
-- This adds the missing status to match what frontend expects
-- ============================================================================

-- First check current status constraint
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conname = 'orders_status_check';

-- Add ready_for_pickup to the allowed statuses (run manually if needed)
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check 
--   CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'ready_for_pickup', 'picked_up', 'delivered', 'cancelled'));

-- For now, the frontend has been fixed to use 'ready' instead of 'ready_for_pickup'

-- ============================================================================
-- FIX 4: Verify the fix worked
-- ============================================================================

-- Check that cafeterias now have profiles
SELECT 
  COUNT(*) as total_cafeterias,
  COUNT(p.id) as cafeterias_with_profiles,
  COUNT(c.user_id) - COUNT(p.id) as missing_profiles
FROM public.cafeterias c
LEFT JOIN public.profiles p ON c.user_id = p.id;

-- Test: Try inserting a notification for a cafeteria (should work now)
-- This is just a test - don't actually run this unless you want to test
-- INSERT INTO notifications (user_id, type, title, message)
-- SELECT user_id, 'test', 'Test', 'Test notification'
-- FROM cafeterias WHERE user_id IS NOT NULL LIMIT 1;

-- ============================================================================
-- Summary
-- ============================================================================
-- 
-- After running this script:
-- 1. All cafeterias will have profile records
-- 2. Order creation will succeed (no FK violation)
-- 3. Delivery agents will automatically receive earnings when they complete deliveries
-- 4. Frontend code now uses 'ready' instead of 'ready_for_pickup' (400 error fixed)
--
-- The delivery agent flow now works as:
-- Customer → Order (pending) → Agent Accepts → Preparing → Ready → Picked Up → Delivered → Earnings Credited ✓
-- ============================================================================
