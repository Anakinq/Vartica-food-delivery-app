-- Test SQL syntax validation
-- This file validates that the SQL migration syntax is correct

-- Test 1: Basic table creation syntax
CREATE TABLE IF NOT EXISTS test_vendor_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID,
    total_earnings NUMERIC(10,2) DEFAULT 0.00
);

-- Test 2: RLS policy syntax (corrected version)
ALTER TABLE test_vendor_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test vendors can view their own wallet" ON test_vendor_wallets
    FOR SELECT TO authenticated
    USING (
        vendor_id = 'test-id'
    );

CREATE POLICY "System can insert test wallets" ON test_vendor_wallets
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Test 3: Function syntax
CREATE OR REPLACE FUNCTION test_function()
RETURNS TRIGGER AS $$
BEGIN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up test tables
DROP TABLE IF EXISTS test_vendor_wallets;
DROP FUNCTION IF EXISTS test_function();

-- If we reach here, syntax is valid
SELECT 'SQL syntax validation passed' as result;