// Check existing users in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jbqhbuogmxqzotlorahn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWhidW9nbXhxem90bG9yYWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTc2NDgsImV4cCI6MjA3NDk3MzY0OH0.APsgWNwZnGnBZpBZTGqL61O3pPLKu4eDmfpsFvk2XMQ';

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