-- Fix agent_payout_profiles table schema
-- Add missing ID column and fix constraints

-- Add ID column if it doesn't exist
ALTER TABLE agent_payout_profiles 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Make user_id not a primary key (it should be unique but not primary)
ALTER TABLE agent_payout_profiles 
DROP CONSTRAINT IF EXISTS agent_payout_profiles_pkey;

-- Add unique constraint on user_id instead
ALTER TABLE agent_payout_profiles 
ADD CONSTRAINT agent_payout_profiles_user_id_unique UNIQUE (user_id);

-- Verify the changes
\d agent_payout_profiles;