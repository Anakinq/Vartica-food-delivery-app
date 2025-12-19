import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCategories() {
    console.log('Testing categories...');

    // Check all unique categories
    const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_items')
        .select('category')
        .neq('category', null);

    if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
    } else {
        const uniqueCategories = [...new Set(categoriesData?.map(item => item.category) || [])];
        console.log('All unique categories in database:', uniqueCategories);

        // Check items in each category
        for (const category of uniqueCategories) {
            const { data: items, error } = await supabase
                .from('menu_items')
                .select('count')
                .eq('category', category);

            if (!error) {
                console.log(`Items in category "${category}":`, items?.length || 0);
            }
        }
    }

    // Check if there are items in the categories we're looking for
    const categoriesToCheck = ['Rice & Pasta', 'Proteins & Sides', 'Drinks'];

    for (const category of categoriesToCheck) {
        const { data: items, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('category', category)
            .limit(5);

        if (error) {
            console.error(`Error fetching items for category "${category}":`, error);
        } else {
            console.log(`Sample items in category "${category}":`, items);
        }
    }
}

testCategories().catch(console.error);