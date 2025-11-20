import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabase() {
    console.log('Testing database connection...');

    // Check cafeterias
    const { data: cafeterias, error: cafeteriasError } = await supabase
        .from('cafeterias')
        .select('*')
        .eq('is_active', true);

    if (cafeteriasError) {
        console.error('Error fetching cafeterias:', cafeteriasError);
    } else {
        console.log('Cafeterias found:', cafeterias?.length || 0);
        console.log('Cafeterias:', cafeterias);
    }

    // Check menu items
    const { data: menuItems, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .limit(10);

    if (menuItemsError) {
        console.error('Error fetching menu items:', menuItemsError);
    } else {
        console.log('Menu items found:', menuItems?.length || 0);
        console.log('Menu items:', menuItems);

        // Check unique categories
        const categories = [...new Set(menuItems?.map(item => item.category).filter(Boolean) || [])];
        console.log('Unique categories:', categories);
    }
}

testDatabase().catch(console.error);