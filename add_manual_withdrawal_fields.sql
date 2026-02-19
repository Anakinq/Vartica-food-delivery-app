-- Add 'pending_approval' to withdrawal status options and add admin tracking columns
-- Run in Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE public.withdrawals 
  DROP CONSTRAINT IF EXISTS withdrawals_status_check;

-- Re-create the constraint with the new status option
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text, 
    'pending_approval'::text,  -- NEW status for manual approval flow
    'processing'::text, 
    'completed'::text, 
    'failed'::text
  ]));

-- Add admin tracking columns
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Update RLS policies to allow agents to see their own withdrawals
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Agents can view their own withdrawals extended') THEN
    CREATE POLICY "Agents can view their own withdrawals extended" 
    ON withdrawals FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM delivery_agents da 
        WHERE da.id = withdrawals.agent_id 
        AND da.user_id = auth.uid()
    ));
  END IF;
END $$;

-- Update RLS policy for inserting withdrawals
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Agents can create their own withdrawals extended') THEN
    CREATE POLICY "Agents can create their own withdrawals extended" 
    ON withdrawals FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM delivery_agents da 
        WHERE da.id = agent_id 
        AND da.user_id = auth.uid()
    ));
  END IF;
END $$;

-- Create policy for admin access to all withdrawals
DO $$
BEGIN
  -- Check if policy exists before creating
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Admins can view all withdrawals') THEN
    CREATE POLICY "Admins can view all withdrawals" 
    ON withdrawals FOR SELECT 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
  
  -- Check if policy exists before creating
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'Admins can update withdrawals') THEN
    CREATE POLICY "Admins can update withdrawals" 
    ON withdrawals FOR UPDATE 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'withdrawals'
ORDER BY ordinal_position;

-- Show current check constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'withdrawals' 
AND tc.constraint_type = 'CHECK';