-- Run this in Supabase SQL Editor to fix the agent_payout_profiles schema

-- Add ID column if it doesn't exist
ALTER TABLE agent_payout_profiles 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Make user_id not a primary key (it should be unique but not primary)
ALTER TABLE agent_payout_profiles 
DROP CONSTRAINT IF EXISTS agent_payout_profiles_pkey;

-- Add primary key on id column
ALTER TABLE agent_payout_profiles 
ADD CONSTRAINT agent_payout_profiles_pkey PRIMARY KEY (id);

-- Add unique constraint on user_id instead
ALTER TABLE agent_payout_profiles 
ADD CONSTRAINT agent_payout_profiles_user_id_unique UNIQUE (user_id);

-- Add missing columns if they don't exist
ALTER TABLE agent_payout_profiles 
ADD COLUMN IF NOT EXISTS recipient_code TEXT;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_payout_profiles' 
ORDER BY ordinal_position;