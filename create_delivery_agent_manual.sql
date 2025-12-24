-- Manual SQL script to create a delivery agent profile after user is created via Supabase Admin API
-- Use this after creating the user via the Supabase dashboard or Admin API

-- 1. First create the user via Supabase Dashboard (Authentication -> Users -> New User)
--    Or use the Admin API to create a user:
--    POST /admin/users with body:
--    {
--      "email": "deliveryagent@example.com",
--      "password": "SecurePassword123!",
--      "email_confirm": true,
--      "user_metadata": {
--        "full_name": "Delivery Agent",
--        "role": "delivery_agent",
--        "phone": "+1234567890"
--      }
--    }

-- 2. After creating the user, get the user ID from the auth.users table
--    You can find it in the Supabase Dashboard under Authentication -> Users

-- 3. Run this SQL script with the actual user ID (replace 'ACTUAL_USER_ID' with the real UUID)

-- Create the profile for the delivery agent
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('ACTUAL_USER_ID_HERE', 'deliveryagent@example.com', 'Delivery Agent', 'delivery_agent', '+1234567890', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create the delivery agent record
INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
VALUES
('ACTUAL_USER_ID_HERE', 'bike', true, 0, 0, 5.00, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Example with a sample UUID (replace with your actual user ID):
-- INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
-- VALUES 
-- ('12345678-1234-1234-1234-123456789abc', 'deliveryagent@example.com', 'Delivery Agent', 'delivery_agent', '+1234567890', NOW())
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
-- VALUES
-- ('12345678-1234-1234-1234-123456789abc', 'bike', true, 0, 0, 5.00, NOW())
-- ON CONFLICT (user_id) DO NOTHING;