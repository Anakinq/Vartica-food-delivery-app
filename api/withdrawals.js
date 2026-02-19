import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get agent_id from query parameters
        const { agent_id } = req.query;

        if (!agent_id) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        // Get withdrawal history for the specific agent
        const { data: withdrawals, error } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('agent_id', agent_id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching withdrawal history:', error);
            return res.status(500).json({ 
                error: 'Failed to fetch withdrawal history',
                details: error.message 
            });
        }

        return res.status(200).json({
            success: true,
            withdrawals,
            count: withdrawals.length
        });

    } catch (error) {
        console.error('Error processing withdrawal history fetch:', error);
        return res.status(500).json({
            error: 'Error processing withdrawal history fetch',
            details: error.message
        });
    }
}