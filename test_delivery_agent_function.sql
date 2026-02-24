-- Test script to check if the add_delivery_agent_role function exists and is working
-- Run this in the Supabase SQL editor

-- Check if the function exists
SELECT proname, proargtypes, prorettype 
FROM pg_proc 
WHERE proname = 'add_delivery_agent_role';

-- Check if delivery_agents table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'delivery_agents';

-- Check if agent_wallets table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'agent_wallets';

-- Check if profiles table has the required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('is_delivery_agent', 'role');

-- Check if delivery_agents table has the required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'delivery_agents' 
AND column_name IN ('user_id', 'vehicle_type', 'is_available', 'is_foot_delivery');

-- Check if agent_wallets table has the required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_wallets' 
AND column_name IN ('agent_id', 'customer_funds', 'delivery_earnings', 'total_balance');

-- Check if the function has proper permissions
SELECT proname, rolname 
FROM pg_proc p 
JOIN pg_roles r ON p.proowner = r.oid 
WHERE proname = 'add_delivery_agent_role';