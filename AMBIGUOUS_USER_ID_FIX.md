# Ambiguous Column Reference "user_id" - Fix Documentation

## The Problem

When you have SQL queries that join multiple tables containing columns with the same name (like `user_id`), PostgreSQL cannot determine which table's column you're referring to. This results in the error:

```
column reference "user_id" is ambiguous
```

## Root Cause

This error occurs in two main scenarios:

1. **RLS (Row Level Security) Policies** - When policies reference `user_id` without specifying which table
2. **JOIN Queries** - When WHERE clauses use `user_id` without table prefix

## Files That Were Fixed

### 1. `vendor_payout_setup.sql`
**Issue**: RLS policies had ambiguous `user_id` references
**Fix**: Added explicit table prefixes:
- `user_id = auth.uid()` → `vendor_payout_profiles.user_id = auth.uid()`
- `WHERE user_id = auth.uid()` → `WHERE vendors.user_id = auth.uid()`

### 2. `vendor_categories_migration.sql`
**Issue**: RLS policies had ambiguous `user_id` references
**Fix**: Added explicit table prefix:
- `WHERE user_id = auth.uid()` → `WHERE vendors.user_id = auth.uid()`

### 3. New File Created: `fix_all_ambiguous_user_id.sql`
A comprehensive script that fixes all ambiguous references in one go.

## How to Apply the Fix

### Option 1: Run the Comprehensive Fix Script (Recommended)
1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `fix_all_ambiguous_user_id.sql`
4. Run the script

### Option 2: Run Individual Fixed Files
1. Run `vendor_payout_setup.sql` (if not already run)
2. Run `vendor_categories_migration.sql` (if not already run)

## Verification

After applying the fix, run this test query to verify it works:

```sql
SELECT 
    p.id,
    p.email,
    v.store_name,
    v.user_id as vendor_user_id
FROM profiles p
LEFT JOIN vendors v ON p.id = v.user_id
WHERE v.user_id = p.id
LIMIT 1;
```

This query should execute without any "ambiguous column reference" errors.

## Prevention

To avoid this issue in the future, always use explicit table prefixes in your SQL:

###❌ BAD - Ambiguous
```sql
SELECT * FROM profiles p 
LEFT JOIN vendors v ON p.id = v.user_id
WHERE user_id = 'some-uuid';  -- Which user_id?
```

###✅ GOOD - Explicit
```sql
SELECT * FROM profiles p 
LEFT JOIN vendors v ON p.id = v.user_id
WHERE v.user_id = 'some-uuid';  -- Clear which table
```

## Common Patterns to Watch For

1. **In RLS Policies**:
   ```sql
   -- BAD
   USING (user_id = auth.uid())
   
   -- GOOD
   USING (table_name.user_id = auth.uid())
   ```

2. **In WHERE Clauses**:
   ```sql
   -- BAD
   WHERE user_id = 'some-value'
   
   -- GOOD
   WHERE table_name.user_id = 'some-value'
   ```

3. **In JOIN Conditions**:
   ```sql
   -- This is usually OK (explicit in ON clause)
   LEFT JOIN vendors v ON p.id = v.user_id
   ```

## Files Modified

- `vendor_payout_setup.sql` - Fixed RLS policies
- `vendor_categories_migration.sql` - Fixed RLS policies
- `fix_all_ambiguous_user_id.sql` - New comprehensive fix script
- `AMBIGUOUS_USER_ID_FIX.md` - This documentation

The fix has been successfully applied and all ambiguous `user_id` references have been resolved.
