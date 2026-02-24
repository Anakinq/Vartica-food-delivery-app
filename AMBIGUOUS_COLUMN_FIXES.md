# Fixing Ambiguous Column References

## The Problem
When you have queries that join multiple tables that contain columns with the same name (like `user_id`), PostgreSQL doesn't know which table's column you're referring to. This results in the error: "column reference 'user_id' is ambiguous".

## Common Scenarios

### 1. JOIN Queries
```sql
-- BAD - Ambiguous user_id
SELECT p.id, p.email, v.store_name
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE user_id = 'some-uuid';  -- Which user_id?

-- GOOD - Explicit table prefix
SELECT p.id, p.email, v.store_name
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE v.user_id = 'some-uuid';  -- Clear which table
```

### 2. RLS Policies
```sql
-- BAD - Ambiguous in policy
CREATE POLICY "Vendors can view own profile"
ON vendor_payout_profiles
FOR SELECT
USING (vendor_id IN (SELECT id FROM vendors WHERE user_id = auth.uid())
       OR user_id = auth.uid());  -- Which user_id?

-- GOOD - Explicit table prefixes
CREATE POLICY "Vendors can view own profile"
ON vendor_payout_profiles
FOR SELECT
USING (vendor_id IN (SELECT id FROM vendors WHERE vendors.user_id = auth.uid())
       OR vendor_payout_profiles.user_id = auth.uid());
```

## How to Fix

### 1. Always Use Table Aliases or Full Table Names
```sql
-- Instead of:
WHERE user_id = 'some-value'

-- Use:
WHERE table_name.user_id = 'some-value'
-- OR
WHERE table_alias.user_id = 'some-value'
```

### 2. Check Your JOINs
When joining tables, always prefix column names:
```sql
SELECT 
    p.id,
    p.email,
    v.store_name,
    v.user_id as vendor_user_id  -- Alias to avoid confusion
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE v.user_id = 'some-uuid';  -- Explicit
```

### 3. Fix RLS Policies
Update all RLS policies to use explicit table names:
```sql
-- Before:
USING (user_id = auth.uid())

-- After:
USING (table_name.user_id = auth.uid())
```

## Files That Were Fixed

1. **debug_profile_query.sql** - Fixed ambiguous WHERE clause
2. **vendor_payout_setup.sql** - Fixed RLS policy ambiguous references
3. **fix_ambiguous_user_id.sql** - Comprehensive fix for all ambiguous references

## Quick Test
Run this query to check if your fix worked:

```sql
-- Test query to verify no ambiguous references
SELECT 
    p.id,
    p.email,
    v.store_name,
    v.user_id as vendor_user_id
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE v.user_id = p.id  -- This should work without errors
LIMIT 1;
```

If this query runs without errors, your ambiguous column reference issues are fixed!