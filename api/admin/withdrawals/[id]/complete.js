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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify admin access (you may need to adjust this based on your auth system)
        // This assumes that admin verification happens via session or token
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Extract admin ID from request (this depends on your auth implementation)
        // For now, assuming admin ID comes from the session or is passed in body
        const { admin_id, paystack_reference, admin_notes } = req.body;
        const { id } = req.query; // The withdrawal ID from the URL parameter

        if (!id) {
            return res.status(400).json({ error: 'Withdrawal ID is required' });
        }

        if (!admin_id) {
            return res.status(403).json({ error: 'Admin ID is required' });
        }

        // Update the withdrawal status to completed
        const { data: withdrawal, error: updateError } = await supabase
            .from('withdrawals')
            .update({
                status: 'completed',
                approved_by: admin_id,
                approved_at: new Date().toISOString(),
                paystack_transfer_code: paystack_reference || null, // reuse for manual ref
                processed_at: new Date().toISOString(),
                admin_notes: admin_notes || null
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating withdrawal status:', updateError);
            return res.status(500).json({ 
                error: 'Failed to update withdrawal status',
                details: updateError.message 
            });
        }

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Withdrawal marked as completed successfully',
            withdrawal: withdrawal
        });

    } catch (error) {
        console.error('Error processing withdrawal completion:', error);
        return res.status(500).json({
            error: 'Error processing withdrawal completion',
            details: error.message
        });
    }
}