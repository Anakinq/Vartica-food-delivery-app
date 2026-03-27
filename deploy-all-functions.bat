@echo off
REM ============================================
REM Deploy Supabase Edge Functions (Windows)
REM ============================================

echo.
echo ============================================
echo Deploying All Edge Functions
echo ============================================
echo.

echo.
echo 🚀 Deploying verify-wallet-payment function...
echo.

REM Deploy the verify-wallet-payment function
supabase functions deploy verify-wallet-payment --no-verify-jwt

echo.
echo ✅ verify-wallet-payment deployed!
echo.

echo.
echo 🚀 Deploying handleAgentWithdrawal function...
echo.

REM Deploy the handleAgentWithdrawal function
supabase functions deploy handleAgentWithdrawal --no-verify-jwt

echo.
echo ✅ handleAgentWithdrawal deployed!
echo.

echo.
echo 🚀 Deploying init-payment function...
echo.

REM Deploy the init-payment function
supabase functions deploy init-payment --no-verify-jwt

echo.
echo ✅ init-payment deployed!
echo.

echo.
echo 🚀 Deploying init-agent-wallet function...
echo.

REM Deploy the init-agent-wallet function
supabase functions deploy init-agent-wallet --no-verify-jwt

echo.
echo ✅ init-agent-wallet deployed!
echo.

echo.
echo 🚀 Deploying registerPaystackRecipient function...
echo.

REM Deploy the registerPaystackRecipient function
supabase functions deploy registerPaystackRecipient --no-verify-jwt

echo.
echo ✅ registerPaystackRecipient deployed!
echo.

echo.
echo 🚀 Deploying recover-missing-payments function...
echo.

REM Deploy the recover-missing-payments function
supabase functions deploy recover-missing-payments --no-verify-jwt

echo.
echo ✅ recover-missing-payments deployed!
echo.

echo.
echo ============================================
echo ✅ ALL FUNCTIONS DEPLOYED SUCCESSFULLY!
echo ============================================
echo.
echo 📍 Function URLs:
echo - verify-wallet-payment: https://jbqhbuogmxqzotlorahn.functions.supabase.co/verify-wallet-payment
echo - handleAgentWithdrawal: https://jbqhbuogmxqzotlorahn.functions.supabase.co/handleAgentWithdrawal
echo - init-payment: https://jbqhbuogmxqzotlorahn.functions.supabase.co/init-payment
echo.
echo 🧪 Test verify-wallet-payment:
echo curl -X POST https://jbqhbuogmxqzotlorahn.functions.supabase.co/verify-wallet-payment ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"user_id\":\"USER_ID\",\"amount\":1000,\"payment_reference\":\"REF_123\"}"
echo.
echo 💡 IMPORTANT: Ensure PAYSTACK_SECRET_KEY is set in Supabase secrets
echo Run: supabase secrets set PAYSTACK_SECRET_KEY=your_key
echo.
pause
