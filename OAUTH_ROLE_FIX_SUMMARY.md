# OAuth Role Assignment Fix Summary

## Problem Description
The application had an issue where Google OAuth signups weren't properly assigning roles to users. When users signed up with Google, they would default to 'customer' role regardless of which signup page they used (vendor or delivery agent).

## Root Cause
During OAuth flows, Supabase doesn't have access to the role information that was selected on the frontend signup page. The auth trigger was only checking for role data in `raw_user_meta_data`, but OAuth flows store this information differently.

## Solution Implemented

### Frontend Changes

1. **AuthCallback Component** (`src/components/auth/AuthCallback.tsx`)
   - Updated to properly extract role and phone from URL query parameters
   - Stores OAuth data in sessionStorage for use during profile creation
   - Improved redirect logic based on assigned role

2. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Enhanced `fetchProfile` function to check for OAuth role in sessionStorage
   - Validates role against allowed values before assignment
   - Properly assigns role from OAuth flow during profile creation

3. **AuthService** (`src/services/supabase/auth.service.ts`)
   - Updated `signUpWithGoogle` to pass role and phone as query parameters
   - Maintains backward compatibility with existing storage-based approach

### Backend Changes

1. **Database Migration** (`supabase/migrations/20260119010800_update_auth_trigger_for_oauth.sql`)
   - Updates the `handle_new_user` function to check both `raw_user_meta_data` and `app_metadata` for role information
   - Provides better fallback handling for user details
   - Ensures proper role assignment for OAuth signups

## How It Works

1. When a user clicks "Sign up with Google" on a specific role page (vendor/delivery agent):
   - The role and phone are passed as query parameters in the OAuth flow
   
2. After Google authentication completes:
   - The callback URL contains the role information
   - AuthCallback extracts and stores this in sessionStorage
   
3. During profile creation:
   - AuthContext checks sessionStorage for OAuth role data
   - Assigns the proper role to the user's profile record
   
4. The auth trigger ensures role-specific records are created appropriately

## Files Modified

- `src/components/auth/AuthCallback.tsx`
- `src/contexts/AuthContext.tsx`
- `src/services/supabase/auth.service.ts`
- `supabase/migrations/20260119010800_update_auth_trigger_for_oauth.sql`

## Database Migration Status

The database migration file exists but could not be applied due to conflicts with existing policies on the remote database. To apply this migration manually:

1. Connect to your Supabase database via SQL Editor
2. Run the SQL from the migration file to update the `handle_new_user` function
3. Ensure the function properly handles both `raw_user_meta_data` and `app_metadata` for role assignment

## Testing

After implementing these changes:

1. Test Google signup for each role type (customer, vendor, delivery agent)
2. Verify that users are assigned the correct role in their profile
3. Confirm that role-specific functionality works as expected
4. Check that existing email/password signup continues to work

## Rollback Plan

If issues arise:
1. Revert the frontend changes in the files mentioned above
2. Restore the previous version of the auth trigger function if the manual database update was applied