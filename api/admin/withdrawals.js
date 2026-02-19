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

        // Get all withdrawal requests with related data
        // Join with profiles and delivery_agents to get agent information
        let query = supabase
            .from('withdrawals')
            .select(`
                withdrawals.*,
                delivery_agents!inner (
                    id,
                    user_id
                ),
                profiles!inner (
                    id,
                    full_name,
                    phone
                ),
                agent_payout_profiles (
                    account_name,
                    account_number,
                    bank_name
                )
            `)
            .order('created_at', { ascending: false });

        // Add status filter if provided
        const { status } = req.query;
        if (status && status !== 'all') {
            query = query.eq('withdrawals.status', status);
        }

        const { data: withdrawals, error } = await query;

        if (error) {
            console.error('Error fetching withdrawal requests:', error);
            return res.status(500).json({ 
                error: 'Failed to fetch withdrawal requests',
                details: error.message 
            });
        }

        // Transform the data to match the expected format
        const transformedWithdrawals = withdrawals.map(w => ({
            id: w.withdrawals.id,
            agent_id: w.withdrawals.agent_id,
            amount: w.withdrawals.amount,
            type: w.withdrawals.type,
            status: w.withdrawals.status,
            created_at: w.withdrawals.created_at,
            processed_at: w.withdrawals.processed_at,
            error_message: w.withdrawals.error_message,
            paystack_transfer_code: w.withdrawals.paystack_transfer_code,
            approved_by: w.withdrawals.approved_by,
            approved_at: w.withdrawals.approved_at,
            admin_notes: w.withdrawals.admin_notes,
            agent: {
                id: w.delivery_agents.id,
                user_id: w.delivery_agents.user_id,
                full_name: w.profiles.full_name,
                phone: w.profiles.phone
            },
            payout_profile: w.agent_payout_profiles || {}
        }));

        return res.status(200).json({
            success: true,
            withdrawals: transformedWithdrawals,
            count: transformedWithdrawals.length
        });

    } catch (error) {
        console.error('Error processing withdrawal requests fetch:', error);
        return res.status(500).json({
            error: 'Error processing withdrawal requests fetch',
            details: error.message
        });
    }
}