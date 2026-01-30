// Simple Node.js script to check cafeteria names in database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCafeteriaNames() {
    try {
        const { data, error } = await supabase
            .from('cafeterias')
            .select('id, name, description')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching cafeterias:', error);
            return;
        }

        console.log('Active Cafeterias:');
        data.forEach(caf => {
            console.log(`- ${caf.name} (ID: ${caf.id})`);
        });

        console.log('\nExpected mappings:');
        const nameMap = {
            'Cafeteria 1': 'caf 1',
            'Cafeteria 2': 'caf 2',
            'Med Cafeteria': 'med caf',
            'Smoothie Shack': 'smoothie shack',
            'Staff Cafeteria': 'caf 3'
        };

        data.forEach(caf => {
            const mapped = nameMap[caf.name];
            console.log(`${caf.name} -> ${mapped || 'NO MAPPING'} (${mapped ? `/images/${mapped}.png` : 'uses default'})`);
        });

    } catch (err) {
        console.error('Error:', err);
    }
}

checkCafeteriaNames();