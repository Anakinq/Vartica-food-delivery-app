/*
  # Seed Test Accounts for Vartica

  This migration creates all pre-registered accounts including:
  - 7 Cafeteria accounts
  - 1 Admin account
  - 1 Late-night vendor account
  - Test delivery agent and student vendor

  ## Important Notes
  1. These are TEST credentials with passwords: Role2024!
  2. User IDs are generated using gen_random_uuid()
  3. In production, use secure password management
  4. Change all passwords after first login

  ## Default Password Pattern
  - Cafeterias: Vartica2024!
  - Admin: Admin2024!
  - Late Night: LateNight2024!
  - Others: [Role]2024!
*/

-- Note: This is a template SQL file showing the structure.
-- Actual user creation must be done through Supabase Auth API or Dashboard
-- because auth.users table cannot be directly inserted into via SQL.

-- Instructions to create accounts:
-- 1. Use Supabase Dashboard -> Authentication -> Add User
-- 2. Or use the Supabase Auth API
-- 3. Then insert corresponding profiles and cafeteria/vendor records below

-- After creating auth users through the dashboard/API, insert their profiles:

-- Example structure (replace USER_IDs with actual UUIDs from auth.users):

/*
-- Admin Account
INSERT INTO profiles (id, email, full_name, role) VALUES
('ADMIN_USER_ID', 'admin@vartica.edu', 'System Administrator', 'admin');

-- Cafeteria 1
INSERT INTO profiles (id, email, full_name, role) VALUES
('CAF1_USER_ID', 'cafeteria1@vartica.edu', 'Cafeteria 1 Staff', 'cafeteria');

INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
('CAF1_USER_ID', 'Cafeteria 1', 'Main campus dining hall', true);

-- Cafeteria 2
INSERT INTO profiles (id, email, full_name, role) VALUES
('CAF2_USER_ID', 'cafeteria2@vartica.edu', 'Cafeteria 2 Staff', 'cafeteria');

INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
('CAF2_USER_ID', 'Cafeteria 2', 'Student center cafeteria', true);

-- Med Cafeteria
INSERT INTO profiles (id, email, full_name, role) VALUES
('MED_USER_ID', 'medcafe@vartica.edu', 'Med Cafeteria Staff', 'cafeteria');

INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
('MED_USER_ID', 'Med Cafeteria', 'Medical school dining', true);

-- Seasons Deli
INSERT INTO profiles (id, email, full_name, role) VALUES
('SEASONS_USER_ID', 'seasons@vartica.edu', 'Seasons Deli Staff', 'cafeteria');

INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
('SEASONS_USER_ID', 'Seasons Deli', 'Fresh sandwiches and salads', true);

-- Smoothie Shack
INSERT INTO profiles (id, email, full_name, role) VALUES
('SMOOTHIE_USER_ID', 'smoothie@vartica.edu', 'Smoothie Shack Staff', 'cafeteria');

INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
('SMOOTHIE_USER_ID', 'Smoothie Shack', 'Healthy smoothies and juices', true);

-- Staff Cafeteria
INSERT INTO profiles (id, email, full_name, role) VALUES
('STAFF_USER_ID', 'staff@vartica.edu', 'Staff Cafeteria Manager', 'cafeteria');

INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
('STAFF_USER_ID', 'Staff Cafeteria', 'Faculty and staff dining', true);

-- Captain Cook
INSERT INTO profiles (id, email, full_name, role) VALUES
('CAPTAIN_USER_ID', 'captain@vartica.edu', 'Captain Cook Manager', 'cafeteria');

INSERT INTO cafeterias (user_id, name, description, is_active) VALUES
('CAPTAIN_USER_ID', 'Captain Cook', 'International cuisine', true);

-- Late-Night Vendor
INSERT INTO profiles (id, email, full_name, role) VALUES
('LATENIGHT_USER_ID', 'latenight@vartica.edu', 'Late Night Vendor', 'vendor');

INSERT INTO vendors (user_id, store_name, description, vendor_type, is_active, available_from, available_until) VALUES
('LATENIGHT_USER_ID', 'Late-Night Vendors', 'Open for late night cravings', 'late_night', true, '21:00:00', '03:00:00');

-- Test Delivery Agent
INSERT INTO profiles (id, email, full_name, role, phone) VALUES
('DELIVERY1_USER_ID', 'delivery1@vartica.edu', 'Test Delivery Agent', 'delivery_agent', '+1-555-0001');

INSERT INTO delivery_agents (user_id, vehicle_type, is_available) VALUES
('DELIVERY1_USER_ID', 'bike', true);

-- Test Student Vendor
INSERT INTO profiles (id, email, full_name, role, phone) VALUES
('VENDOR1_USER_ID', 'vendor1@vartica.edu', 'Test Student Vendor', 'vendor', '+1-555-0002');

INSERT INTO vendors (user_id, store_name, description, vendor_type, is_active) VALUES
('VENDOR1_USER_ID', 'Test Food Store', 'Student-run food business', 'student', true);
*/

-- Hardcoded Delivery Agent Account with real UUID
INSERT INTO profiles (id, email, full_name, role, phone, created_at) VALUES
('d2f4e7a1-b8c9-4c5d-9e6f-7a8b9c0d1e2f', 'deliveryagent@vartica.edu', 'Test Delivery Agent', 'delivery_agent', '+1-555-0003', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery_agents (user_id, vehicle_type, is_available, created_at) VALUES
('d2f4e7a1-b8c9-4c5d-9e6f-7a8b9c0d1e2f', 'bike', true, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Hardcoded Student Vendor Account with real UUID
INSERT INTO profiles (id, email, full_name, role, phone, created_at) VALUES
('e3g5f8b2-c9d0-5d6e-0f7g-8a9b0c1e3f4g', 'studentvendor@vartica.edu', 'Test Student Vendor', 'vendor', '+1-555-0004', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO vendors (user_id, store_name, description, image_url, vendor_type, is_active, created_at) VALUES
('e3g5f8b2-c9d0-5d6e-0f7g-8a9b0c1e3f4g', 'Student Vendor Store', 'Student-run food business', '/images/1.jpg', 'student', true, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Add some sample promo codes
INSERT INTO promo_codes (code, discount_type, discount_value, min_order_value, valid_from, valid_until, is_active) VALUES
('WELCOME10', 'percentage', 10, 0, NOW(), NOW() + INTERVAL '90 days', true),
('SAVE5', 'fixed', 5, 20, NOW(), NOW() + INTERVAL '90 days', true),
('STUDENT15', 'percentage', 15, 15, NOW(), NOW() + INTERVAL '90 days', true),
('LATENIGHT20', 'percentage', 20, 25, NOW(), NOW() + INTERVAL '90 days', true);

-- Sample menu items for testing (uncomment and replace CAF1_ID with actual cafeteria ID)
/*
INSERT INTO menu_items (seller_id, seller_type, name, description, price, category, is_available) VALUES
('CAF1_ID', 'cafeteria', 'Classic Burger', 'Juicy beef patty with lettuce, tomato, and our special sauce', 8.99, 'Main Course', true),
('CAF1_ID', 'cafeteria', 'Caesar Salad', 'Fresh romaine lettuce with parmesan and croutons', 6.99, 'Salad', true),
('CAF1_ID', 'cafeteria', 'French Fries', 'Crispy golden fries', 3.99, 'Snack', true),
('CAF1_ID', 'cafeteria', 'Iced Coffee', 'Cold brew coffee with milk', 4.49, 'Beverage', true);
*/
