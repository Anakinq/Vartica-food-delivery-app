import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDatabase() {
    try {
        console.log('Updating database schema...');

        // Add recipient_code column to agent_payout_profiles
        const { error: error1 } = await supabase
            .rpc('execute_sql', {
                sql: `ALTER TABLE agent_payout_profiles ADD COLUMN IF NOT EXISTS recipient_code TEXT;`
            });

        if (error1) {
            console.log('recipient_code column already exists or error:', error1.message);
        } else {
            console.log('✓ Added recipient_code column to agent_payout_profiles');
        }

        // Add missing columns to withdrawals table
        const { error: error2 } = await supabase
            .rpc('execute_sql', {
                sql: `ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS paystack_transfer_code TEXT;`
            });

        if (error2) {
            console.log('paystack_transfer_code column error:', error2.message);
        } else {
            console.log('✓ Added paystack_transfer_code column to withdrawals');
        }

        const { error: error3 } = await supabase
            .rpc('execute_sql', {
                sql: `ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS paystack_reference TEXT;`
            });

        if (error3) {
            console.log('paystack_reference column error:', error3.message);
        } else {
            console.log('✓ Added paystack_reference column to withdrawals');
        }

        // Create indexes
        const { error: error4 } = await supabase
            .rpc('execute_sql', {
                sql: `CREATE INDEX IF NOT EXISTS idx_agent_payout_profiles_recipient_code ON agent_payout_profiles(recipient_code);`
            });

        if (error4) {
            console.log('Index creation error:', error4.message);
        } else {
            console.log('✓ Created index on recipient_code');
        }

        const { error: error5 } = await supabase
            .rpc('execute_sql', {
                sql: `CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);`
            });

        if (error5) {
            console.log('Index creation error:', error5.message);
        } else {
            console.log('✓ Created index on withdrawals status');
        }

        console.log('Database update completed successfully!');

    } catch (error) {
        console.error('Error updating database:', error);
    }
}

updateDatabase();