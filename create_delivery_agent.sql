-- Create a delivery agent account manually in Supabase
-- This script creates both the auth user and the profile in one go

-- First, insert the user into the auth.users table
-- Note: You'll need to replace 'your-delivery-agent@email.com' and 'your-password' with actual values
-- The password will need to be hashed properly by Supabase

-- Since we can't directly insert into auth.users with a plain text password,
-- we'll need to use Supabase's auth API to create the user, then update the profile

-- Step 1: Create a user via Supabase Auth API (this needs to be done via API, not SQL)
-- Use this API call instead of SQL for user creation:
/*
POST https://[your-project-ref].supabase.co/auth/v1/signup
Headers:
  Content-Type: application/json
  Authorization: Bearer [your-anon-key]

Body:
{
  "email": "deliveryagent@example.com",
  "password": "SecurePassword123!",
  "data": {
    "full_name": "Delivery Agent",
    "role": "delivery_agent",
    "phone": "+1234567890"
  }
}
*/

-- Step 2: If the user already exists in auth.users but doesn't have a profile,
-- you can create the profile manually (replace the user ID with the actual user ID):
/*
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('USER_ID_HERE', 'deliveryagent@example.com', 'Delivery Agent', 'delivery_agent', '+1234567890', NOW())
ON CONFLICT (id) DO NOTHING;
*/

-- Alternative: If you have access to create a user directly in auth (for testing purposes)
-- You can insert a user directly into the auth.users table (this is usually restricted):
/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_autoflowed_at,
  email_autoflowed_by,
  email_bounced_at,
  email_bounced_reason,
  blocked_until,
  app_metadata,
  user_metadata
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- instance_id
  gen_random_uuid(), -- id
  'authenticated', -- aud
  'authenticated', -- role
  'deliveryagent@example.com', -- email
  crypt('SecurePassword123!', gen_salt('bf')), -- encrypted_password (requires pgcrypto extension)
  NOW(), -- email_confirmed_at
  NULL, -- invited_at
  '', -- confirmation_token
  NULL, -- confirmation_sent_at
  '', -- recovery_token
  NULL, -- recovery_sent_at
  '', -- email_change_token_new
  '', -- email_change
  NULL, -- email_change_sent_at
  NULL, -- last_sign_in_at
  NOW(), -- created_at
  NOW(), -- updated_at
  NULL, -- phone
  NULL, -- phone_confirmed_at
  '', -- phone_change
  '', -- phone_change_token
  NULL, -- phone_change_sent_at
  NULL, -- email_autoflowed_at
  NULL, -- email_autoflowed_by
  NULL, -- email_bounced_at
  NULL, -- email_bounced_reason
  NULL, -- blocked_until
  '{"provider": "email", "providers": ["email"]}', -- app_metadata
  '{"full_name": "Delivery Agent", "role": "delivery_agent"}' -- user_metadata
);
*/

-- Step 3: Then create the profile (replace USER_ID_HERE with the actual UUID from auth.users):
/*
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('USER_ID_HERE', 'deliveryagent@example.com', 'Delivery Agent', 'delivery_agent', '+1234567890', NOW())
ON CONFLICT (id) DO NOTHING;
*/

-- Step 4: Also create the delivery agent record (replace USER_ID_HERE with the actual UUID):
/*
INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
VALUES
('USER_ID_HERE', 'bike', true, 0, 0, 5.00, NOW())
ON CONFLICT (user_id) DO NOTHING;
*/

-- Complete working example (replace placeholders with actual values):
-- First, you'll need to create the user via the Supabase Auth API
-- Then, once you have the user ID, run these commands:

-- Example with placeholder USER_ID - replace with actual UUID:
-- INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
-- VALUES 
-- ('ACTUAL_USER_ID_HERE', 'deliveryagent@example.com', 'Delivery Agent', 'delivery_agent', '+1234567890', NOW())
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, created_at)
-- VALUES
-- ('ACTUAL_USER_ID_HERE', 'bike', true, 0, 0, 5.00, NOW())
-- ON CONFLICT (user_id) DO NOTHING;