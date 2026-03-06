@echo off
REM ============================================
REM Deploy All Supabase Edge Functions (Windows)
REM ============================================
REM This script deploys all 5 Supabase Edge Functions

echo.
echo ========================================
echo 🚀 Deploying All Supabase Edge Functions
echo ========================================
echo.

REM Set Supabase project reference
set SUPABASE_PROJECT_REF=jbqhbuogmxqzotlorahn

echo 📦 Deploying 1/5: init-payment...
supabase functions deploy init-payment --project-ref %SUPABASE_PROJECT_REF%

echo.
echo 📦 Deploying 2/5: handleAgentWithdrawal...
supabase functions deploy handleAgentWithdrawal --project-ref %SUPABASE_PROJECT_REF%

echo.
echo 📦 Deploying 3/5: registerPaystackRecipient...
supabase functions deploy registerPaystackRecipient --project-ref %SUPABASE_PROJECT_REF%

echo.
echo 📦 Deploying 4/5: init-agent-wallet...
supabase functions deploy init-agent-wallet --project-ref %SUPABASE_PROJECT_REF%

echo.
echo 📦 Deploying 5/5: verify-bank-account...
supabase functions deploy verify-bank-account --project-ref %SUPABASE_PROJECT_REF%

echo.
echo ========================================
echo ✅ All Functions Deployed Successfully!
echo ========================================
echo.
echo 📍 Function URLs:
echo    - init-payment: https://%SUPABASE_PROJECT_REF%.functions.supabase.co/init-payment
echo    - handleAgentWithdrawal: https://%SUPABASE_PROJECT_REF%.functions.supabase.co/handleAgentWithdrawal
echo    - registerPaystackRecipient: https://%SUPABASE_PROJECT_REF%.functions.supabase.co/registerPaystackRecipient
echo    - init-agent-wallet: https://%SUPABASE_PROJECT_REF%.functions.supabase.co/init-agent-wallet
echo    - verify-bank-account: https://%SUPABASE_PROJECT_REF%.functions.supabase.co/verify-bank-account
echo.

pause
