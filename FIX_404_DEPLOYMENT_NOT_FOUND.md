# Fix for 404: DEPLOYMENT_NOT_FOUND Error

## Problem
The application is returning a 404 error with the message `DEPLOYMENT_NOT_FOUND` when trying to access certain API endpoints.

## Root Cause
Two issues were identified:

1. **Missing Supabase Edge Functions**: The `supabase/config.toml` was missing configuration for 2 of 5 Edge Functions:
   - `init-agent-wallet`
   - `verify-bank-account`

2. **Vercel API Routes Not Configured**: The `vercel.json` was not routing `/api/` paths to the API functions.

## Fixes Applied

### 1. Updated `supabase/config.toml`
Added missing function configurations:
- `init-agent-wallet`
- `verify-bank-account`

### 2. Created `deploy-all-functions.bat`
New deployment script that deploys all 5 Supabase Edge Functions:
- init-payment
- handleAgentWithdrawal
- registerPaystackRecipient
- init-agent-wallet
- verify-bank-account

### 3. Updated `vercel.json`
Added API route rewrite to route `/api/*` paths to the API functions.

## Deployment Steps

### Step 1: Deploy Supabase Edge Functions

Run the new deployment script:

```bash
deploy-all-functions.bat
```

Or manually deploy each function:

```bash
supabase functions deploy init-payment --project-ref jbqhbuogmxqzotlorahn
supabase functions deploy handleAgentWithdrawal --project-ref jbqhbuogmxqzotlorahn
supabase functions deploy registerPaystackRecipient --project-ref jbqhbuogmxqzotlorahn
supabase functions deploy init-agent-wallet --project-ref jbqhbuogmxqzotlorahn
supabase functions deploy verify-bank-account --project-ref jbqhbuogmxqzotlorahn
```

### Step 2: Deploy to Vercel

Redeploy your Vercel project to pick up the new `vercel.json` configuration:

```bash
vercel deploy --prod
```

Or push to GitHub to trigger automatic deployment.

## Verify Deployment

After deployment, verify the functions are working:

- Supabase Edge Functions: https://jbqhbuogmxqzotlorahn.functions.supabase.co
- Test: https://jbqhbuogmxqzotlorahn.functions.supabase.co/init-agent-wallet

## Environment Variables Required

Make sure these are set in Vercel:
- `SUPABASE_URL`: https://jbqhbuogmxqzotlorahn.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: (from .env)
- `PAYSTACK_SECRET_KEY`: Your Paystack secret key

## If Issues Persist

1. Check Supabase Edge Function logs in Supabase dashboard
2. Verify environment variables are set correctly in Vercel
3. Run `vercel.json` validation: `npx vercel env pull`
