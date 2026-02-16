-- Add recipient_code column to agent_payout_profiles table
ALTER TABLE agent_payout_profiles 
ADD COLUMN IF NOT EXISTS recipient_code TEXT;

-- Add missing columns to withdrawals table for better tracking
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS paystack_transfer_code TEXT,
ADD COLUMN IF NOT EXISTS paystack_reference TEXT;

-- Update existing columns if they exist with different names
DO $$
BEGIN
    -- Rename old column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'withdrawals' 
               AND column_name = 'paystack_transfer_reference') THEN
        ALTER TABLE withdrawals 
        RENAME COLUMN paystack_transfer_reference TO paystack_reference;
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agent_payout_profiles_recipient_code 
ON agent_payout_profiles(recipient_code);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status 
ON withdrawals(status);