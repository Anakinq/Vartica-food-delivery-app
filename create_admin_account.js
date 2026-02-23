// Script to create or update an admin user in the Vartica food delivery app
// Usage: node create_admin_account.js [email] [full_name]

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: Missing Supabase configuration in environment variables.');
    console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminAccount(email, fullName) {
    console.log(`🚀 Creating/Updating admin account for: ${email}`);

    try {
        // First, check if user already exists in auth
        let { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('❌ Error fetching users from auth:', authError);
            return;
        }

        // Find user by email
        const existingUser = users.find(user => user.email === email);

        if (!existingUser) {
            console.log('❌ User does not exist in authentication system.');
            console.log('📝 Please create the user account first through the app or Supabase dashboard.');
            return;
        }

        console.log(`✅ Found user in auth system: ${existingUser.email} (ID: ${existingUser.id})`);

        // Insert or update profile with admin role
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: existingUser.id,
                email: email,
                full_name: fullName,
                role: 'admin',
                created_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (profileError) {
            console.error('❌ Error creating/updating profile:', profileError);
            return;
        }

        console.log('✅ Admin profile created/updated successfully!');
        console.log(`👤 Admin user: ${fullName} (${email})`);
        console.log(`🔑 Role: admin`);
        console.log(`🆔 User ID: ${existingUser.id}`);

        // Verify the admin role was set
        const { data: verificationData, error: verificationError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', existingUser.id)
            .single();

        if (verificationError) {
            console.error('❌ Error verifying admin role:', verificationError);
        } else {
            console.log(`📋 Verification: User role is now '${verificationData.role}'`);
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const fullName = args[1];

if (!email || !fullName) {
    console.log('📋 Usage: node create_admin_account.js [email] [full_name]');
    console.log('📋 Example: node create_admin_account.js admin@example.com "System Administrator"');
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    console.error('❌ Invalid email format:', email);
    process.exit(1);
}

// Run the function
createAdminAccount(email, fullName);