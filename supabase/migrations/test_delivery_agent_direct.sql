-- Test if the function exists and check its signature
SELECT proname, proargtypes, prosrc 
FROM pg_proc 
WHERE proname = 'add_delivery_agent_role';

-- Check if delivery_agents table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'delivery_agents';

-- Check if profiles table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles';

-- Check your current user ID
SELECT auth.uid();

-- Manually test creating a delivery agent (replace YOUR_USER_ID)
-- First, check if you have a profile:
SELECT * FROM public.profiles WHERE id = 'YOUR_USER_ID';

-- If profile exists, manually insert:
-- INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available, active_orders_count, total_deliveries, rating, is_approved, is_foot_delivery)
-- VALUES ('YOUR_USER_ID', 'Foot', FALSE, 0, 0, 5.00, FALSE, TRUE);

-- Update profile:
-- UPDATE public.profiles SET is_delivery_agent = TRUE, role = 'delivery_agent' WHERE id = 'YOUR_USER_ID';
