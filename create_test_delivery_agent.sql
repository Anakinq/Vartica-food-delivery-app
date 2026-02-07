-- ============================================
-- CREATE TEST DELIVERY AGENT ACCOUNT
-- ============================================
-- This script creates a complete test delivery agent account
-- 
-- INSTRUCTIONS:
-- 1. First create the user via Supabase Dashboard:
--    - Go to Supabase Dashboard > Authentication > Users > New User
--    - Email: test.delivery.agent@vartica.edu
--    - Password: TestPassword123!
--    - User Metadata:
--      {
--        "full_name": "Test Delivery Agent",
--        "role": "delivery_agent",
--        "phone": "+2348012345678",
--        "vehicle_type": "bike"
--      }
-- 2. After creating the user, copy the User ID from the dashboard
-- 3. Replace 'USER_ID_PLACEHOLDER' in this script with the actual User ID
-- 4. Run this script in Supabase SQL Editor

-- ============================================
-- STEP 1: Create the profile (if not auto-created by auth trigger)
-- ============================================
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('USER_ID_PLACEHOLDER', 'test.delivery.agent@vartica.edu', 'Test Delivery Agent', 'delivery_agent', '+2348012345678', NOW())
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone;

-- ============================================
-- STEP 2: Create the delivery agent record
-- ============================================
INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
VALUES
('USER_ID_PLACEHOLDER', 'bike', true, 0, 0, 5.00, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  vehicle_type = EXCLUDED.vehicle_type,
  is_available = EXCLUDED.is_available,
  active_orders_count = EXCLUDED.active_orders_count,
  total_deliveries = EXCLUDED.total_deliveries,
  rating = EXCLUDED.rating;

-- ============================================
-- STEP 3: Verify the creation
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
    p.created_at as profile_created,
    da.created_at as agent_created
FROM profiles p
JOIN delivery_agents da ON da.user_id = p.id
WHERE p.email = 'test.delivery.agent@vartica.edu';

-- ============================================
-- ALTERNATIVE: Create multiple test delivery agents
-- ============================================
/*
-- Test Delivery Agent 1
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('USER_ID_1', 'delivery1@vartica.edu', 'Delivery Agent One', 'delivery_agent', '+2348011111111', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
VALUES
('USER_ID_1', 'bike', true, 0, 0, 5.00, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Test Delivery Agent 2
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('USER_ID_2', 'delivery2@vartica.edu', 'Delivery Agent Two', 'delivery_agent', '+2348022222222', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
VALUES
('USER_ID_2', 'motorcycle', true, 0, 0, 5.00, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Test Delivery Agent 3
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('USER_ID_3', 'delivery3@vartica.edu', 'Delivery Agent Three', 'delivery_agent', '+2348033333333', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
VALUES
('USER_ID_3', 'car', true, 0, 0, 5.00, NOW())
ON CONFLICT (user_id) DO NOTHING;
*/