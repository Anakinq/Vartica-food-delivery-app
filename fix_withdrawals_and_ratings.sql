-- ============================================================================
-- COMPREHENSIVE FIX FOR WITHDRAWALS AND RATINGS
-- ============================================================================

-- ============================================================================
-- PART 1: Fix admin_withdrawals_view
-- ============================================================================

-- The delivery_agents table does NOT have a name column
-- We need to join with profiles table via user_id to get agent name

-- Create view using profiles for agent name
-- Uses COALESCE with multiple fallbacks: full_name, user_name, email
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
  -- Agent payout profile fields
  ap.bank_code AS payout_bank_name,
  ap.account_number AS payout_account_number,
  ap.account_name AS payout_account_name,
  -- Agent info - get name from profiles table via user_id
  -- Uses multiple fallbacks: full_name -> user_name -> email -> 'Unknown'
  COALESCE(p.full_name, p.user_name, p.email, 'Unknown') AS agent_name,
  p.email AS agent_email,
  da.user_id AS agent_user_id
FROM withdrawals w
LEFT JOIN delivery_agents da ON w.agent_id = da.id
LEFT JOIN profiles p ON da.user_id = p.id
LEFT JOIN agent_payout_profiles ap ON da.user_id = ap.user_id
ORDER BY w.created_at DESC;

-- Grant permissions
GRANT SELECT ON admin_withdrawals_view TO authenticated;
GRANT SELECT ON admin_withdrawals_view TO anon;
GRANT SELECT ON admin_withdrawals_view TO service_role;

-- ============================================================================
-- PART 2: Fix delivery_ratings - Add missing 'review' column
-- ============================================================================

ALTER TABLE delivery_ratings 
ADD COLUMN IF NOT EXISTS review TEXT DEFAULT '';

GRANT SELECT, INSERT, UPDATE ON delivery_ratings TO authenticated;
GRANT SELECT ON delivery_ratings TO anon;

-- ============================================================================
-- AFTER RUNNING: Refresh PostgREST schema cache
-- Go to Supabase Dashboard > Settings > API > Click "Reload schema"
-- ============================================================================
