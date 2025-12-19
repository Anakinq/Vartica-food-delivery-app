-- ============================================
-- FIX DELIVERY AGENT SETUP
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check which accounts exist
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    da.id as agent_id,
    da.is_available
FROM profiles p
LEFT JOIN delivery_agents da ON da.user_id = p.id
WHERE p.role = 'delivery_agent';

-- Expected: You should see your delivery agent profile(s) listed
-- If agent_id is NULL, that means the delivery_agents record is missing!

-- ============================================
-- Step 2: CREATE MISSING DELIVERY AGENT RECORDS
-- ============================================
-- This will create delivery_agents records for any delivery_agent profiles
-- that don't already have one

INSERT INTO delivery_agents (user_id, vehicle_type, is_available)
SELECT 
    p.id,
    'bike' as vehicle_type,
    true as is_available
FROM profiles p
WHERE p.role = 'delivery_agent'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_agents da 
    WHERE da.user_id = p.id
  );

-- ============================================
-- Step 3: VERIFY - Check again
-- ============================================
SELECT 
    p.email,
    p.full_name,
    p.role,
    da.vehicle_type,
    da.is_available,
    da.total_deliveries
FROM profiles p
JOIN delivery_agents da ON da.user_id = p.id
WHERE p.role = 'delivery_agent';

-- Expected: All delivery agents should now have matching records!
