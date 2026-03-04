-- Fix admin_withdrawals_view to properly display wallet type and full account number

-- Drop existing view
DROP VIEW IF EXISTS admin_withdrawals_view;

-- Create the view that joins withdrawals with agent_payout_profiles to get bank details
CREATE OR REPLACE VIEW admin_withdrawals_view AS
SELECT 
    w.id,
    w.agent_id,
    w.amount,
    w.status,
    -- Use 'type' column which is what the API actually writes to
    COALESCE(w.type, 'delivery_earnings') as withdrawal_type,
    -- For backwards compatibility, also check withdrawal_type
    COALESCE(w.withdrawal_type, w.type, 'delivery_earnings') as type,
    w.created_at,
    w.updated_at,
    w.processed_at,
    w.error_message,
    w.paystack_transfer_code,
    w.paystack_transfer_reference,
    w.admin_notes,
    w.approved_by,
    w.approved_at,
    w.sent_at,
    w.rejected_by,
    w.rejected_at,
    w.rejection_reason,
    -- Agent profile info
    p.full_name as agent_name,
    p.email as agent_email,
    p.phone as agent_phone,
    -- Bank/payout details - show FULL account number for admin
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
        ELSE COALESCE(app.bank_code, 'Unknown Bank')
    END as payout_bank_name
FROM withdrawals w
LEFT JOIN delivery_agents da ON w.agent_id = da.id
LEFT JOIN profiles p ON da.user_id = p.id
LEFT JOIN agent_payout_profiles app ON da.user_id = app.user_id
ORDER BY w.created_at DESC;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON admin_withdrawals_view TO authenticated;
GRANT SELECT ON admin_withdrawals_view TO anon;
GRANT SELECT ON admin_withdrawals_view TO service_role;

-- Verify the view was created
SELECT 'admin_withdrawals_view updated successfully' as status;
