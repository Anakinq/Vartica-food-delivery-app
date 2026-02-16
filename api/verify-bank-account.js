import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { agent_id, account_number, bank_code } = req.body;

    if (!agent_id || !account_number || !bank_code) {
      return res.status(400).json({ 
        error: 'Missing required fields: agent_id, account_number, bank_code' 
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
    const PAYSTACK_BASE_URL = 'https://api.paystack.co';

    // Verify the account number using Paystack API with proper error handling
    let verificationResult;
    try {
      const response = await fetch(`${PAYSTACK_BASE_URL}/bank/resolve`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number,
          bank_code
        })
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Paystack API Error (${response.status}):`, errorText);
        throw new Error(`Paystack API Error: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error('Empty response from Paystack API');
      }

      try {
        verificationResult = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
    } catch (paystackError) {
      console.error('Paystack verification error:', paystackError);
      return res.status(400).json({
        success: false,
        error: 'Account verification failed',
        details: paystackError.message
      });
    }

    if (!verificationResult.status) {
      return res.status(400).json({
        success: false,
        error: 'Account verification failed',
        details: verificationResult.message
      });
    }

    // Get the agent's user ID to ensure they have the right permissions
    const { data: agentData, error: agentError } = await supabase
      .from('delivery_agents')
      .select('user_id')
      .eq('id', agent_id)
      .single();

    if (agentError || !agentData) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Use upsert to handle both insert and update cases
    const { data: result, error: upsertError } = await supabase
      .from('agent_payout_profiles')
      .upsert({
        user_id: agentData.user_id,
        account_number: account_number,
        account_name: verificationResult.data.account_name,
        bank_code: bank_code,
        verified: true
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      throw upsertError;
    }

    return res.status(200).json({
      success: true,
      message: 'Bank account verified and saved successfully',
      data: {
        account_name: verificationResult.data.account_name,
        bank_name: verificationResult.data.bank_name
      }
    });

  } catch (error) {
    console.error('Error verifying bank account:', error);
    return res.status(500).json({ 
      error: 'Error verifying bank account', 
      details: error.message 
    });
  }
}