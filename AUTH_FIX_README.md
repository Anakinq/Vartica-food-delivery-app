# Authentication Setup Guide

## 🔧 Fixing Authentication Issues

The main issues preventing signup/signin are:

1. **Missing Supabase Configuration** - Your `.env` file contains placeholder values
2. **Missing Database Setup** - Authentication triggers and functions need to be created
3. **Incomplete OAuth Setup** - OAuth role assignment needs proper database triggers

## 🚀 Step-by-Step Fix

### 1. Configure Supabase Credentials

First, update your `.env` file with your actual Supabase credentials:

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to "Project Settings" → "API"
4. Copy your Project URL and anon key
5. Update your `.env` file:

```env
VITE_SUPABASE_URL=https://your-actual-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
VITE_APP_URL=http://localhost:5173
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your-paystack-public-key-here
PAYSTACK_SECRET_KEY=sk_test_your-paystack-secret-key-here
```

### 2. Set Up Database Triggers

Run the database setup script in your Supabase SQL editor:

1. Go to your Supabase Dashboard
2. Go to "SQL Editor"
3. Copy the contents of `fix_auth_setup.sql`
4. Paste and run it in the SQL editor

This will:
- Create the `handle_new_user()` function that automatically creates user profiles
- Set up proper OAuth role handling
- Enable Row Level Security (RLS) with appropriate policies
- Create the authentication trigger

### 3. Test Your Setup

Run the diagnostic script to verify everything is working:

```bash
node test_auth_setup.js
```

This will check:
- ✅ Supabase configuration
- ✅ Database connection
- ✅ Authentication triggers
- ✅ Required functions

### 4. Enable Email Authentication

In your Supabase Dashboard:
1. Go to "Authentication" → "Providers"
2. Ensure "Email" is enabled
3. Configure your email settings for production use

### 5. For OAuth (Google Sign-in)

If you want to use Google OAuth:

1. **Set up Google OAuth in Supabase:**
   - Go to "Authentication" → "Providers"
   - Enable "Google"
   - Add your Google Client ID and Secret

2. **Configure redirect URLs:**
   - Add `http://localhost:5173/auth/callback` to your Google OAuth redirect URIs
   - For production, add your deployed URL

## 🛠️ Common Issues and Solutions

### Issue: "Invalid login credentials"
**Solution:** Check that your Supabase credentials are correct in `.env`

### Issue: "User profile not found"
**Solution:** Run the `fix_auth_setup.sql` script to create the database triggers

### Issue: OAuth roles not assigned correctly
**Solution:** The database trigger handles this automatically after running the setup script

### Issue: "Network error" or "Connection failed"
**Solution:** 
- Verify your Supabase project URL is correct
- Check your internet connection
- Ensure your Supabase project is not paused

## 🧪 Testing Authentication

After setup, test these scenarios:

1. **Email Signup:** Create a new account with email/password
2. **Email Signin:** Login with existing credentials
3. **OAuth Signup:** Try signing up with Google (if configured)
4. **Role-based Access:** Verify different user roles get appropriate dashboards

## 📋 Checklist

Before running your app, ensure you have:

- [ ] Updated `.env` with real Supabase credentials
- [ ] Run `fix_auth_setup.sql` in Supabase SQL editor
- [ ] Enabled email authentication in Supabase dashboard
- [ ] (Optional) Configured Google OAuth if needed
- [ ] Run `test_auth_setup.js` to verify setup

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. Check browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your Supabase project is active (not paused)
4. Check that the required database tables exist (`profiles`, `vendors`, `delivery_agents`)

## 🎯 Next Steps

Once authentication is working:
- Test all user roles (customer, vendor, delivery agent)
- Verify profile creation and role assignment
- Test OAuth flows if configured
- Set up proper email templates in Supabase

The app should now allow users to sign up and sign in successfully!