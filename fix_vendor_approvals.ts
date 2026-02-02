import { createClient } from '@supabase/supabase-js';

// This script fixes any vendors that were approved but not properly updated in the vendors table
// Run this script once to ensure all previously approved vendors are properly set in the database

async function fixVendorApprovals() {
    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        // Find vendors that are approved in profiles table but not in vendors table
        const { data: approvedProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, vendor_approved')
            .is('vendor_approved', true);

        if (profilesError) {
            console.error('Error fetching approved profiles:', profilesError);
            return;
        }

        // Update vendors table for each approved profile
        for (const profile of approvedProfiles) {
            const { error: vendorUpdateError } = await supabase
                .from('vendors')
                .update({
                    is_active: true,
                    application_status: 'approved'
                })
                .eq('user_id', profile.id)
                .neq('application_status', 'approved'); // Only update if not already approved

            if (vendorUpdateError) {
                console.error(`Error updating vendor for user ${profile.id}:`, vendorUpdateError);
            } else {
                console.log(`Successfully updated vendor for user ${profile.id}`);
            }
        }

        console.log('Vendor approval fix completed.');
    } catch (error) {
        console.error('Error in fixVendorApprovals:', error);
    }
}

// Run the fix
fixVendorApprovals();