# Delivery Agent Registration Troubleshooting Guide

## Common Issues and Solutions

### 1. Function Does Not Exist Error
**Error Message**: "function add_delivery_agent_role does not exist"

**Solution**: 
1. Run the SQL file `fix_delivery_agent_function.sql` in your Supabase dashboard
2. This will create the missing database function

### 2. Permission Denied Error
**Error Message**: "permission denied for function add_delivery_agent_role"

**Solution**:
1. Make sure you're logged in as an authenticated user
2. Run the following in Supabase SQL Editor:
   ```sql
   GRANT EXECUTE ON FUNCTION public.add_delivery_agent_role(UUID, TEXT) TO authenticated;
   ```

### 3. Already Registered Error
**Error Message**: "User is already registered as a delivery agent"

**Solution**:
- This is expected if you've already registered. You can check your current role in the profile section.

### 4. Profile Not Found Error
**Error Message**: "No profile found for user"

**Solution**:
- Make sure you have a complete profile
- Log out and log back in to refresh your session
- Try completing your profile information first

## Testing Steps

1. **Run the test SQL script**:
   - Execute `test_delivery_agent_function.sql` in your Supabase dashboard
   - This will check if all required tables and columns exist

2. **Run the JavaScript test**:
   - Update the credentials in `test_delivery_agent_registration.js`
   - Run: `node test_delivery_agent_registration.js`

3. **Manual Test**:
   - Try to register as a delivery agent through the app
   - Check the browser console for detailed error messages

## If Problems Persist

1. **Check Supabase Logs**:
   - Go to your Supabase dashboard
   - Check the "Logs" section for any database errors

2. **Verify Database Schema**:
   - Make sure all required tables exist:
     - `profiles`
     - `delivery_agents`
     - `agent_wallets`
   - Make sure required columns exist in `profiles`:
     - `is_delivery_agent` (BOOLEAN)
     - `role` (TEXT)

3. **Check RLS Policies**:
   - Verify that Row Level Security policies allow:
     - Authenticated users to call the function
     - Users to update their own profile
     - Users to create delivery agent records

## Quick Fix Commands

Run these in your Supabase SQL Editor if needed:

```sql
-- Enable the function
GRANT EXECUTE ON FUNCTION public.add_delivery_agent_role(UUID, TEXT) TO authenticated;

-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_name IN ('delivery_agents', 'agent_wallets');

-- Check profile columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('is_delivery_agent', 'role');
```