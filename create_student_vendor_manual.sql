-- Manual SQL script to create a student vendor profile after user is created via Supabase Admin API
-- Use this after creating the user via the Supabase dashboard or Admin API

-- 1. First create the user via Supabase Dashboard (Authentication -> Users -> New User)
--    Or use the Admin API to create a user:
--    POST /admin/users with body:
--    {
--      "email": "studentvendor@example.com",
--      "password": "SecurePassword123!",
--      "email_confirm": true,
--      "user_metadata": {
--        "full_name": "Student Vendor",
--        "role": "vendor",
--        "phone": "+1234567890"
--      }
--    }

-- 2. After creating the user, get the user ID from the auth.users table
--    You can find it in the Supabase Dashboard under Authentication -> Users

-- 3. Run this SQL script with the actual user ID (replace 'ACTUAL_USER_ID' with the real UUID)

-- Create the profile for the student vendor
INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
VALUES 
('ACTUAL_USER_ID_HERE', 'studentvendor@example.com', 'Student Vendor', 'vendor', '+1234567890', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create the vendor record
INSERT INTO vendors (user_id, store_name, description, image_url, vendor_type, is_active, created_at)
VALUES
('ACTUAL_USER_ID_HERE', 'Student Vendor Store', 'Student-run food business', '/images/1.jpg', 'student', true, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Example with a sample UUID (replace with your actual user ID):
-- INSERT INTO profiles (id, email, full_name, role, phone, created_at) 
-- VALUES 
-- ('12345678-1234-1234-1234-123456789abc', 'studentvendor@example.com', 'Student Vendor', 'vendor', '+1234567890', NOW())
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO vendors (user_id, store_name, description, image_url, vendor_type, is_active, created_at)
-- VALUES
-- ('12345678-1234-1234-1234-123456789abc', 'Student Vendor Store', 'Student-run food business', '/images/1.jpg', 'student', true, NOW())
-- ON CONFLICT (user_id) DO NOTHING;