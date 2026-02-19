-- Apply manual approval fields to agent_withdrawals table
-- Run this in Supabase SQL Editor

-- Add 'pending_approval' status to the check constraint
ALTER TABLE agent_withdrawals 
  DROP CONSTRAINT IF EXISTS agent_withdrawals_status_check;

ALTER TABLE agent_withdrawals
  ADD CONSTRAINT agent_withdrawals_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text, 
    'pending_approval'::text,  -- NEW status for manual approval flow
    'processing'::text, 
    'completed'::text, 
    'failed'::text
  ]));

-- Add admin tracking columns
ALTER TABLE agent_withdrawals
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;  -- When admin marks as sent

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_pending_approval 
  ON agent_withdrawals(status) WHERE status = 'pending_approval';

CREATE INDEX IF NOT EXISTS idx_agent_withdrawals_approved_by 
  ON agent_withdrawals(approved_by);

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agent_withdrawals' 
  AND column_name IN ('status', 'approved_by', 'approved_at', 'admin_notes', 'sent_at')
ORDER BY ordinal_position;