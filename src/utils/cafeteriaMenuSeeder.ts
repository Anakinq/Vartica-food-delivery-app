import { supabase } from '../lib/supabase';
import { getImageUrl } from './imageUploader';

// Define the mapping of food items to their corresponding image files in the public directory
const foodItemImages: Record<string, string> = {
    'jollof rice': 'JOLLOF RICE.jpg',
    'white rice': 'white rice.jpg',
    'fried rice': 'fried rice.jpg',
    'porridge yam': 'porridge yam.jpg',
    'white beans': 'porridge beans.jpg',
    'porridge beans': 'porridge beans.jpg',
    'white spag': 'white spag.jpg',
    'moimoi': 'moimoi.jpg',
    'egg': 'boiled egg.jpg',
    'beef': 'beef.jpg',
    'fish': 'fried fish.jpg',
    'plantain': 'plantain.jpg',
    'chicken': 'chicken.jpg',
    'eba': 'eba.jpg',
    'semo': 'semo.jpg',
    'fufu': 'fufu.jpg',
    'pounded yam': 'pounded yam.jpg',
    'pancake': 'pancakes.jpg',
    'waffles': 'waffles.jpg',
    'ponmo': 'ponmo.jpg',
    'indomie': 'indomie.jpg',
    'shawarma': 'sharwama.jpg',
    'toast': 'toast bread.jpg',
    'syrup': 'maple syrup.jpg',
    'afang': 'afang soup.jpg',
    'okro': 'okro soup.jpg',
    'bitter leaf': 'bitter leaf soup.jpg',
    'chicken pepper soup': 'chicken pepper soup.jpg',
    'ewedu': 'ewedu.jpg',
    'vegetable': 'vegetable soup.jpg',
    'egusi': 'egusi soup.jpg',
};

// Define the fixed prices for each food item
const foodItemPrices: Record<string, number> = {
    'jollof rice': 500,
    'white rice': 500,
    'fried rice': 500,
    'porridge yam': 500,
    'white beans': 500,
    'porridge beans': 500,
    'white spag': 500,
    'moimoi': 500,
    'egg': 300,
    'beef': 400,
    'fish': 400,
    'plantain (3)': 300,
    'chicken': 2500,
    'eba': 300,
    'semo': 300,
    'fufu': 300,
    'pounded yam': 500,
    'pancake': 400,
    'waffles': 400,
    'ponmo': 300,
    'indomie': 800,
    'shawarma': 1500,
    'toast': 400,
    'syrup': 400,
    'afang': 2000,
    'okro': 400,
    'bitter leaf': 2000,
    'chicken pepper soup': 2000,
    'ewedu': 4000,
    'vegetable': 2000,
    'egusi': 400,
};

// Define categories for different food types
const categorizeFood = (foodName: string): string => {
    const lowerName = foodName.toLowerCase();

    // Main food category
    if (['jollof rice', 'white rice', 'fried rice', 'porridge yam', 'white beans', 'porridge beans', 'white spag'].includes(lowerName)) {
        return 'Main Food';
    }

    // Protein category
    if (['moimoi', 'egg', 'beef', 'fish', 'plantain (3)', 'chicken'].includes(lowerName)) {
        return 'Protein';
    }

    // Swallow category
    if (['eba', 'semo', 'fufu', 'pounded yam'].includes(lowerName)) {
        return 'Swallow';
    }

    // Soup category
    if (['afang', 'okro', 'bitter leaf', 'chicken pepper soup', 'ewedu', 'vegetable', 'egusi', 'soup'].includes(lowerName)) {
        return 'Soup';
    }

    // Other category
    if (['pancake', 'waffles', 'ponmo', 'indomie', 'shawarma', 'toast', 'syrup'].includes(lowerName)) {
        return 'Other';
    }

    // Default category
    return 'Other';
};

// Get the fixed price for a food item
const getFixedPrice = (foodName: string): number => {
    const lowerName = foodName.toLowerCase();

    // Check if we have a specific price for this food item
    if (foodItemPrices[lowerName] !== undefined) {
        return foodItemPrices[lowerName];
    }

    // Default price if not specified
    return 500;
};

// Function to clear existing cafeteria menu items
const clearCafeteriaMenu = async (cafeteriaId: string) => {
    try {
        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('seller_id', cafeteriaId)
            .eq('seller_type', 'cafeteria');

        if (error) {
            console.error('Error clearing cafeteria menu:', error);
            return { success: false, error };
        }

        console.log('Cafeteria menu cleared successfully');
        return { success: true };
    } catch (error) {
        console.error('Error clearing cafeteria menu:', error);
        return { success: false, error };
    }
};

// Function to seed cafeteria menu with the requested food items
export const seedCafeteriaMenu = async (cafeteriaId: string): Promise<{ success: boolean; message: string; error?: any }> => {
    try {
        // First, clear existing menu items
        const clearResult = await clearCafeteriaMenu(cafeteriaId);
        if (!clearResult.success) {
            return {
                success: false,
                message: 'Failed to clear existing menu items',
                error: clearResult.error
            };
        }

        console.log('Cleared existing menu items, now adding new ones...');
        // List of all food items to add with exact specifications
        const foodItems = [
            'Jollof Rice',
            'White Rice',
            'Fried Rice',
            'Porridge yam',
            'White beans',
            'Porridge beans',
            'White Spag',
            'White Spag', // Added twice as requested
            'Moimoi',
            'Egg',
            'Beef',
            'Fish',
            'Plantain (3)', // Updated as requested
            'Chicken',
            'Eba',
            'Semo',
            'Fufu',
            'Pounded yam',
            'Pancake',
            'Waffles',
            'Ponmo',
            'Indomie',
            'Shawarma',
            'Toast',
            'Syrup',
            'The special soups',
            'Afang',
            'Okro',
            'Bitter leaf',
            'Chicken pepper soup',
            'Ewedu',
            'Vegetable',
            'Egusi',
        ];

        // Remove duplicates while preserving order
        const uniqueFoodItems = Array.from(new Set(foodItems.map(item => item.toLowerCase())))
            .map(name => foodItems.find(item => item.toLowerCase() === name)!)
            .filter(item => item.toLowerCase() !== 'the special soups'); // Remove the generic "special soups" entry

        console.log(`Adding ${uniqueFoodItems.length} unique food items to cafeteria ${cafeteriaId}...`);

        for (const foodName of uniqueFoodItems) {
            const lowerName = foodName.toLowerCase();
            const imageFilename = foodItemImages[lowerName] || 'food-placeholder.png';
            const imageUrl = await getImageUrl(imageFilename);

            const price = getFixedPrice(foodName);
            const category = categorizeFood(foodName);

            // Check if item already exists to avoid duplicates
            const { data: existingItem } = await supabase
                .from('menu_items')
                .select('*')
                .eq('seller_id', cafeteriaId)
                .eq('seller_type', 'cafeteria')
                .eq('name', foodName)
                .single();

            if (existingItem) {
                console.log(`Item ${foodName} already exists, skipping...`);
                continue;
            }

            // Insert the new menu item
            const { error } = await supabase
                .from('menu_items')
                .insert([{
                    name: foodName,
                    description: `Delicious ${foodName} prepared with the finest ingredients`,
                    price: price,
                    category: category,
                    image_url: imageUrl,
                    seller_id: cafeteriaId,
                    seller_type: 'cafeteria',
                    is_available: true,
                    created_at: new Date().toISOString(),
                }]);

            if (error) {
                console.error(`Error adding ${foodName}:`, error);
            } else {
                console.log(`Successfully added ${foodName} to menu`);
            }
        }

        console.log('Cafeteria menu seeding completed!');
        return { success: true, message: `Added ${uniqueFoodItems.length} food items to cafeteria menu` };
    } catch (error) {
        console.error('Error seeding cafeteria menu:', error);
        return { success: false, message: 'Failed to seed cafeteria menu', error };
    }
};