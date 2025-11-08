#!/bin/bash
# ============================================
# Deploy Supabase Edge Functions
# ============================================
# Run this script after updating functions

echo "🚀 Deploying handleAgentWithdrawal function..."

# Login to Supabase (run once)
# supabase login

# Deploy the function
supabase functions deploy handleAgentWithdrawal

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Function URL:"
echo "https://jbqhbuogmxqzotlorahn.functions.supabase.co/handleAgentWithdrawal"
echo ""
echo "🧪 Test with curl:"
echo 'curl -X POST https://jbqhbuogmxqzotlorahn.functions.supabase.co/handleAgentWithdrawal \'
echo '  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"agent_id":"AGENT_ID","amount_kobo":1000,"type":"delivery_earnings"}'"'"''
echo ""
echo "💡 Expected response: {\"error\":\"...\"}  (proves function is live)"
