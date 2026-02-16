-- Fix agent_payout_profiles table structure
-- Add missing columns and constraints

-- First, check if the table exists and has the right structure
DO $$
BEGIN
    -- Add id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_payout_profiles' 
                   AND column_name = 'id') THEN
        ALTER TABLE agent_payout_profiles ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;

    -- Add recipient_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_payout_profiles' 
                   AND column_name = 'recipient_code') THEN
        ALTER TABLE agent_payout_profiles ADD COLUMN recipient_code TEXT;
    END IF;

    -- Ensure other required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_payout_profiles' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE agent_payout_profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_payout_profiles' 
                   AND column_name = 'account_number') THEN
        ALTER TABLE agent_payout_profiles ADD COLUMN account_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_payout_profiles' 
                   AND column_name = 'account_name') THEN
        ALTER TABLE agent_payout_profiles ADD COLUMN account_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_payout_profiles' 
                   AND column_name = 'bank_code') THEN
        ALTER TABLE agent_payout_profiles ADD COLUMN bank_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_payout_profiles' 
                   AND column_name = 'verified') THEN
        ALTER TABLE agent_payout_profiles ADD COLUMN verified BOOLEAN DEFAULT false;
    END IF;

    -- Add missing columns to withdrawals table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' 
                   AND column_name = 'paystack_transfer_code') THEN
        ALTER TABLE withdrawals ADD COLUMN paystack_transfer_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' 
                   AND column_name = 'paystack_reference') THEN
        ALTER TABLE withdrawals ADD COLUMN paystack_reference TEXT;
    END IF;

    -- Create indexes for better performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'agent_payout_profiles' 
                   AND indexname = 'idx_agent_payout_profiles_recipient_code') THEN
        CREATE INDEX idx_agent_payout_profiles_recipient_code ON agent_payout_profiles(recipient_code);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'agent_payout_profiles' 
                   AND indexname = 'idx_agent_payout_profiles_user_id') THEN
        CREATE INDEX idx_agent_payout_profiles_user_id ON agent_payout_profiles(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'withdrawals' 
                   AND indexname = 'idx_withdrawals_status') THEN
        CREATE INDEX idx_withdrawals_status ON withdrawals(status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                   WHERE tablename = 'withdrawals' 
                   AND indexname = 'idx_withdrawals_agent_id') THEN
        CREATE INDEX idx_withdrawals_agent_id ON withdrawals(agent_id);
    END IF;

END $$;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Policy for agent_payout_profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own payout profiles') THEN
        CREATE POLICY "Users can view their own payout profiles" 
        ON agent_payout_profiles FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can insert their own payout profiles') THEN
        CREATE POLICY "Users can insert their own payout profiles" 
        ON agent_payout_profiles FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can update their own payout profiles') THEN
        CREATE POLICY "Users can update their own payout profiles" 
        ON agent_payout_profiles FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    -- Policy for withdrawals
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Agents can view their own withdrawals') THEN
        CREATE POLICY "Agents can view their own withdrawals" 
        ON withdrawals FOR SELECT 
        USING (EXISTS (
            SELECT 1 FROM delivery_agents da 
            WHERE da.id = withdrawals.agent_id 
            AND da.user_id = auth.uid()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Agents can create their own withdrawals') THEN
        CREATE POLICY "Agents can create their own withdrawals" 
        ON withdrawals FOR INSERT 
        WITH CHECK (EXISTS (
            SELECT 1 FROM delivery_agents da 
            WHERE da.id = agent_id 
            AND da.user_id = auth.uid()
        ));
    END IF;

END $$;