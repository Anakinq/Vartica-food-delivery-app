-- ============================================================================
-- FIX FOR ADMIN WITHDRAWALS VIEW
-- Issues Fixed:
-- 1. SQL Error: column ap.agent_id does not exist (wrong JOIN)
-- 2. Agent ID not showing as Agent Name
-- 3. Bank Details not showing
-- 4. Processed At not showing
-- ============================================================================

-- Step 1: Check the current structure of agent_payout_profiles table
-- This helps verify the correct column to join on
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_payout_profiles' 
ORDER BY ordinal_position;

-- Step 2: Check the structure of delivery_agents table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'delivery_agents' 
ORDER BY ordinal_position;

-- Step 3: Drop and recreate the admin_withdrawals_view with correct JOIN
-- The key fix: agent_payout_profiles has user_id (not agent_id), 
-- so we join on da.user_id = ap.user_id

DROP VIEW IF EXISTS admin_withdrawals_view;

CREATE VIEW admin_withdrawals_view AS
SELECT 
  w.id,
  w.agent_id,
  w.amount,
  w.status,
  w.type AS withdrawal_type,
  w.created_at,
  w.processed_at,
  w.admin_notes,
  w.error_message,
  -- Agent payout profile fields (bank details)
  -- These will now show correctly after fixing the JOIN
  ap.bank_name AS payout_bank_name,
  ap.account_number AS payout_account_number,
  ap.account_name AS payout_account_name,
  ap.bank_code AS payout_bank_code,
  -- Agent info - use full_name from delivery_agents for agent name
  COALESCE(da.full_name, da.name) AS agent_name,
  da.email AS agent_email,
  da.phone AS agent_phone,
  -- Also include the user_id for reference
  da.user_id AS agent_user_id
FROM withdrawals w
LEFT JOIN delivery_agents da ON w.agent_id = da.id
-- FIX: Join on user_id, not agent_id (agent_payout_profiles uses user_id)
LEFT JOIN agent_payout_profiles ap ON da.user_id = ap.user_id
ORDER BY w.created_at DESC;

-- Step 4: Grant permissions on the view
GRANT SELECT ON admin_withdrawals_view TO authenticated;
GRANT SELECT ON admin_withdrawals_view TO anon;
GRANT SELECT ON admin_withdrawals_view TO service_role;

-- Step 5: Verify the view works by testing it
-- This should return data without errors now
SELECT * FROM admin_withdrawals_view LIMIT 5;
