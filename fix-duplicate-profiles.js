import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://jbqhbuogmxqzotlorahn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5NzY0OCwiZXhwIjoyMDc0OTczNjQ4fQ.PxrzHpwRJaOK6e4YQIDwnsWZeS_VeHdkhgOqmaKr9ZY'
);

async function fixDuplicateProfiles() {
    try {
        console.log('🔍 Checking for duplicate agent payout profiles...');
        
        // Find duplicate user_ids
        const { data: duplicates, error: duplicateError } = await supabase
            .from('agent_payout_profiles')
            .select('user_id, count(*)')
            .group('user_id')
            .having('count', '>', 1);

        if (duplicateError) {
            console.error('Error checking duplicates:', duplicateError);
            return;
        }

        if (duplicates && duplicates.length > 0) {
            console.log('❌ Found duplicate profiles:');
            console.log(duplicates);
            
            // For each duplicate user_id, keep the first record and delete the rest
            for (const dup of duplicates) {
                const { data: allRecords, error: fetchError } = await supabase
                    .from('agent_payout_profiles')
                    .select('id, created_at')
                    .eq('user_id', dup.user_id)
                    .order('created_at', { ascending: true });

                if (fetchError) {
                    console.error('Error fetching records for user:', dup.user_id, fetchError);
                    continue;
                }

                if (allRecords && allRecords.length > 1) {
                    // Keep the first (oldest) record, delete the rest
                    const recordsToDelete = allRecords.slice(1);
                    console.log(`Found ${recordsToDelete.length} duplicate records for user ${dup.user_id}`);
                    
                    for (const record of recordsToDelete) {
                        const { error: deleteError } = await supabase
                            .from('agent_payout_profiles')
                            .delete()
                            .eq('id', record.id);
                        
                        if (deleteError) {
                            console.error('Error deleting duplicate record:', record.id, deleteError);
                        } else {
                            console.log('✅ Deleted duplicate record:', record.id);
                        }
                    }
                }
            }
        } else {
            console.log('✅ No duplicate profiles found');
        }

        // Verify the fix worked
        console.log('\n🔍 Verifying fix...');
        const { data: verifyData, error: verifyError } = await supabase
            .from('agent_payout_profiles')
            .select('user_id, count(*)')
            .group('user_id')
            .having('count', '>', 1);

        if (verifyError) {
            console.error('Error verifying fix:', verifyError);
        } else if (verifyData && verifyData.length > 0) {
            console.log('❌ Still have duplicates:', verifyData);
        } else {
            console.log('✅ All duplicates removed successfully!');
        }

        // Test the specific user profile
        console.log('\n🔍 Checking specific user profile...');
        const { data: userProfile, error: userError } = await supabase
            .from('agent_payout_profiles')
            .select('*')
            .eq('user_id', '0e0b6857-1859-415c-8bbf-da7274260773');

        if (userError) {
            console.error('Error fetching user profile:', userError);
        } else {
            console.log('User profile status:', userProfile);
            if (userProfile && userProfile.length > 0) {
                console.log('✅ User profile exists and is ready for updates');
            } else {
                console.log('ℹ️  No profile found for user - will be created on first update');
            }
        }

    } catch (error) {
        console.error('❌ Error in duplicate fix:', error);
    }
}

fixDuplicateProfiles();