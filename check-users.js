// Check existing users in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkExistingUsers() {
    console.log('Checking existing users...');

    try {
        // Check if we can access the auth users table
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

        if (usersError) {
            console.log('Cannot access auth users directly (requires service role key)');
            console.log('Checking profiles table instead...');

            // Check profiles table
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .limit(10);

            if (profilesError) {
                console.error('Error accessing profiles:', profilesError);
            } else {
                console.log('Found profiles:', profiles);
                if (profiles && profiles.length > 0) {
                    console.log('Existing users found:');
                    profiles.forEach(profile => {
                        console.log(`- ${profile.email} (${profile.role})`);
                    });
                } else {
                    console.log('No profiles found in database');
                }
            }
        } else {
            console.log('Auth users:', users);
        }

        // Check cafeterias
        const { data: cafeterias, error: cafeteriaError } = await supabase
            .from('cafeterias')
            .select('*');

        if (cafeteriaError) {
            console.error('Error accessing cafeterias:', cafeteriaError);
        } else {
            console.log('Cafeterias:', cafeterias);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

checkExistingUsers();