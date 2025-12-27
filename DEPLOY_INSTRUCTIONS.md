# Supabase Authentication Trigger Fix - Deployment Instructions

## Issue
When users sign up, only `auth.users` record is created but `profiles` record is not created, causing profile loading to fail during login.

## Solution
Deploy the production-safe authentication trigger to your Supabase database.

## Steps to Deploy

### 1. Access Supabase SQL Editor
- Go to your Supabase Dashboard
- Navigate to your project
- Click on "SQL" in the left sidebar
- Click on "New query" button

### 2. Run the SQL Script
Copy and paste the following SQL code into the query editor:

```sql
-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the production-safe function to handle new user profile creation with role-specific records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  -- Create base profile
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create vendor record if role is 'vendor'
  IF user_role = 'vendor' THEN
    INSERT INTO public.vendors (user_id, store_name, vendor_type, is_active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'store_name', 'New Vendor'),
      COALESCE(NEW.raw_user_meta_data->>'vendor_type', 'student'),
      true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Create delivery agent record if role is 'delivery_agent'
  IF user_role = 'delivery_agent' THEN
    INSERT INTO public.delivery_agents (user_id, vehicle_type, is_available)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'Bike'),
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER INSERT only (not UPDATE) to avoid multiple executions
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and role-specific records when a user is created';
```

### 3. Execute the Query
- Click the "RUN" button
- You should see a success message indicating the trigger has been created

### 4. Verify the Trigger
To verify the trigger was created successfully, run this query:

```sql
SELECT tgname as trigger_name, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass AND t.tgname = 'on_auth_user_created';
```

You should see the trigger listed in the results.

## What This Fix Does
- Creates profiles automatically when users sign up (not waiting for email confirmation)
- Creates vendor records when users sign up with role='vendor'
- Creates delivery agent records when users sign up with role='delivery_agent'
- Uses INSERT-only trigger to avoid multiple executions
- Handles metadata passed during signup (role, store_name, vendor_type, etc.)

## Frontend Requirements
Make sure your signup calls pass the role in metadata:

```javascript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role: "vendor",  // or "delivery_agent"
      vendor_type: "student",  // for vendors
      store_name: "John's Snacks",  // for vendors
      full_name: "John Doe",
      phone: "080xxxxxxx"
    }
  }
});
```

## Test the Fix
1. Create a new test user with role='vendor'
2. Check that both `auth.users` and `profiles` records are created
3. Verify that a corresponding record is created in the `vendors` table
4. Try logging in - the profile should load correctly