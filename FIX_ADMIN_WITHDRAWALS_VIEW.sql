-- SQL script to fix the admin withdrawals view with proper column names

-- Step 1: Drop the existing view if it exists
DROP VIEW IF EXISTS admin_withdrawals_view;

-- Step 2: Create the new view with properly aliased columns
CREATE VIEW admin_withdrawals_view AS
SELECT 
  w.id,
  w.agent_id,
  w.amount,
  w.status,
  w.created_at,
  w.processed_at,
  w.error_message,
  w.paystack_transfer_code,
  w.admin_notes,
  w.type,
  app.account_name as payout_account_name,
  app.account_number as payout_account_number,
  app.bank_code as payout_bank_code,
  CASE 
    WHEN app.bank_code = '044' THEN 'Access Bank'
    WHEN app.bank_code = '063' THEN 'Access Bank (Diamond)'
    WHEN app.bank_code = '035A' THEN 'ALAT by WEMA'
    WHEN app.bank_code = '401' THEN 'ASO Savings and Loans'
    WHEN app.bank_code = '023' THEN 'Citibank Nigeria'
    WHEN app.bank_code = '050' THEN 'Ecobank Nigeria'
    WHEN app.bank_code = '562' THEN 'Ekondo Microfinance Bank'
    WHEN app.bank_code = '070' THEN 'Fidelity Bank'
    WHEN app.bank_code = '011' THEN 'First Bank of Nigeria'
    WHEN app.bank_code = '214' THEN 'First City Monument Bank'
    WHEN app.bank_code = '901' THEN 'FSDH Merchant Bank Limited'
    WHEN app.bank_code = '00103' THEN 'Globus Bank'
    WHEN app.bank_code = '100022' THEN 'GoMoney'
    WHEN app.bank_code = '058' THEN 'Guaranty Trust Bank'
    WHEN app.bank_code = '030' THEN 'Heritage Bank'
    WHEN app.bank_code = '301' THEN 'Jaiz Bank'
    WHEN app.bank_code = '082' THEN 'Keystone Bank'
    WHEN app.bank_code = '559' THEN 'Kuda Bank'
    WHEN app.bank_code = '50211' THEN 'Kuda Microfinance Bank'
    WHEN app.bank_code = '999992' THEN 'OPay'
    WHEN app.bank_code = '526' THEN 'Parallex Bank'
    WHEN app.bank_code = '999991' THEN 'PalmPay'
    WHEN app.bank_code = '076' THEN 'Polaris Bank'
    WHEN app.bank_code = '101' THEN 'Providus Bank'
    WHEN app.bank_code = '125' THEN 'Rubies MFB'
    WHEN app.bank_code = '51310' THEN 'Sparkle Microfinance Bank'
    WHEN app.bank_code = '221' THEN 'Stanbic IBTC Bank'
    WHEN app.bank_code = '068' THEN 'Standard Chartered Bank'
    WHEN app.bank_code = '232' THEN 'Sterling Bank'
    WHEN app.bank_code = '100' THEN 'Suntrust Bank'
    WHEN app.bank_code = '302' THEN 'TAJ Bank'
    WHEN app.bank_code = '102' THEN 'Titan Bank'
    WHEN app.bank_code = '032' THEN 'Union Bank of Nigeria'
    WHEN app.bank_code = '033' THEN 'United Bank For Africa'
    WHEN app.bank_code = '215' THEN 'Unity Bank'
    WHEN app.bank_code = '566' THEN 'VFD Microfinance Bank'
    WHEN app.bank_code = '035' THEN 'Wema Bank'
    WHEN app.bank_code = '057' THEN 'Zenith Bank'
    ELSE app.bank_code
  END as payout_display_bank_name,
  p.full_name as agent_profile_name,
  p.email as agent_profile_email
FROM withdrawals w
LEFT JOIN delivery_agents da ON w.agent_id = da.id
LEFT JOIN agent_payout_profiles app ON da.user_id = app.user_id
LEFT JOIN profiles p ON da.user_id = p.id
ORDER BY w.created_at DESC;

-- Verification query
SELECT 'admin_withdrawals_view has been recreated with proper column names' as status;