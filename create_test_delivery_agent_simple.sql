-- ============================================
-- SIMPLE TEST DELIVERY AGENT CREATION
-- Uses auth trigger to auto-create profile and delivery agent record
-- ============================================

-- This approach relies on the auth trigger to automatically create:
-- 1. Profile record in profiles table
-- 2. Delivery agent record in delivery_agents table

-- Simply create the user via Supabase Auth API or Dashboard with these details:

/*
EMAIL: test.delivery.agent@vartica.edu
PASSWORD: TestPassword123!
USER METADATA:
{
  "full_name": "Test Delivery Agent",
  "role": "delivery_agent",
  "phone": "+2348012345678",
  "vehicle_type": "bike"
}
*/

-- The auth trigger will automatically:
-- 1. Create a profile in the profiles table with role='delivery_agent'
-- 2. Create a record in delivery_agents table with the specified vehicle_type

-- ============================================
-- To verify the account was created correctly:
-- ============================================
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.role,
    p.phone,
    da.vehicle_type,
    da.is_available,
    da.active_orders_count,
    da.total_deliveries,
    da.rating,
    p.created_at as profile_created
FROM profiles p
LEFT JOIN delivery_agents da ON da.user_id = p.id
WHERE p.email = 'test.delivery.agent@vartica.edu';

-- ============================================
-- If the delivery agent record wasn't created automatically:
-- Run this to create it manually:
-- ============================================
/*
INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
SELECT 
    p.id,
    'bike',  -- or 'motorcycle', 'car', etc.
    true,    -- is_available
    0,       -- active_orders_count
    0,       -- total_deliveries
    5.00,    -- rating
    NOW()    -- created_at
FROM profiles p
WHERE p.email = 'test.delivery.agent@vartica.edu'
  AND p.role = 'delivery_agent'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_agents da WHERE da.user_id = p.id
  );
*/