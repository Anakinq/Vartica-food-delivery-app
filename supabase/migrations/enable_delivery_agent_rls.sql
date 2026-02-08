-- Enable RLS and grant permissions for delivery agent registration
-- Run this to allow users to register as delivery agents

-- Check existing RLS policies on profiles
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check existing RLS policies on delivery_agents
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'delivery_agents';

-- Allow authenticated users to update their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" 
        ON profiles FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = id);
    END IF;
END $$;

-- Allow authenticated users to insert delivery agents for themselves
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'delivery_agents' 
        AND policyname = 'Users can create own delivery agent record'
    ) THEN
        CREATE POLICY "Users can create own delivery agent record" 
        ON delivery_agents FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Allow authenticated users to view their own delivery agent record
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'delivery_agents' 
        AND policyname = 'Users can view own delivery agent record'
    ) THEN
        CREATE POLICY "Users can view own delivery agent record" 
        ON delivery_agents FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Allow authenticated users to insert their own agent wallet
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_wallets' 
        AND policyname = 'Users can create own agent wallet'
    ) THEN
        CREATE POLICY "Users can create own agent wallet" 
        ON agent_wallets FOR INSERT 
        TO authenticated 
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM delivery_agents 
                WHERE delivery_agents.id = agent_wallets.agent_id 
                AND delivery_agents.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow authenticated users to select their own agent wallet
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_wallets' 
        AND policyname = 'Users can view own agent wallet'
    ) THEN
        CREATE POLICY "Users can view own agent wallet" 
        ON agent_wallets FOR SELECT 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM delivery_agents 
                WHERE delivery_agents.id = agent_wallets.agent_id 
                AND delivery_agents.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'delivery_agents', 'agent_wallets');
