@echo off
REM ============================================
REM Deploy Supabase Edge Functions (Windows)
REM ============================================

echo.
echo 🚀 Deploying handleAgentWithdrawal function...
echo.

REM Login to Supabase (run once)
REM supabase login

REM Deploy the function
supabase functions deploy handleAgentWithdrawal

echo.
echo ✅ Deployment complete!
echo.
echo 📍 Function URL:
echo https://jbqhbuogmxqzotlorahn.functions.supabase.co/handleAgentWithdrawal
echo.
echo 🧪 Test with curl:
echo curl -X POST https://jbqhbuogmxqzotlorahn.functions.supabase.co/handleAgentWithdrawal ^
echo   -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
echo   -H "Content-Type: application/json" ^
echo   -d "{\"agent_id\":\"AGENT_ID\",\"amount_kobo\":1000,\"type\":\"delivery_earnings\"}"
echo.
echo 💡 Expected: {"error":"..."} proves function is live
echo.
pause
