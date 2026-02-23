# Admin Access Setup

## Quick Admin Access

I've added a dedicated admin login page to make accessing the admin dashboard easier without hardcoding credentials insecurely.

## How to Use

### Method 1: Through the Landing Page
1. Go to your app's main page
2. Click the "Admin Access" button in the header (blue button)
3. Use the pre-filled credentials:
   - Email: `admin@vartica.edu`
   - Password: `Admin2024!`
4. Click "Login as Admin"

### Method 2: Direct URL Access
Navigate directly to: `/#/admin-login`

## Setting Up the Admin User

### Step 1: Create the Admin Account
First, you need to create the admin user account in your database. You can do this in two ways:

#### Option A: Using the App Interface
1. Go to your app
2. Select "Admin" from the role selection
3. Click "Sign Up" 
4. Fill in the details:
   - Email: `admin@vartica.edu`
   - Password: `Admin2024!`
   - Full Name: `System Administrator`

#### Option B: Using SQL (Recommended)
Run the SQL script `setup_admin_user.sql` in your Supabase SQL Editor.

### Step 2: Verify Admin Access
After creating the account:
1. Go to `/#/admin-login`
2. Login with the credentials
3. You should be redirected to the admin dashboard

## Security Notes

- The admin login page has the credentials pre-filled for convenience
- The credentials are still required for authentication
- The admin role must be properly set in the database
- This is a development convenience feature - in production, you should use proper authentication flows

## Files Created/Modified

- `src/components/admin/AdminLogin.tsx` - New admin login component
- `src/App.tsx` - Added admin login route
- `src/components/LandingPage.tsx` - Added admin access button
- `setup_admin_user.sql` - SQL script to create admin user
- `create_admin_account.js` - Node.js script for admin user creation

## Troubleshooting

If admin login doesn't work:
1. Make sure the admin user exists in your database
2. Verify the user has `role = 'admin'` in the profiles table
3. Check that the email and password match exactly
4. Ensure you're using the correct Supabase instance