import { supabase } from '../lib/supabase/client';
import { getImageUrl } from './imageUploader';
import { withAuth } from './authWrapper';

// Define the mapping of food items to their corresponding image files in the public directory
const foodItemImages: Record<string, string> = {
    'jollof rice': 'JOLLOF RICE.jpg',
    'white rice': 'white rice.jpg',
    'fried rice': 'fried rice.jpg',
    'porridge yam': 'porridge yam.jpg',
    'white beans': 'porridge beans.jpg',
    'porridge beans': 'porridge beans.jpg',
    'white spag': 'white spag.jpg',
    'jollof spag': 'jollof spag.jpg',
    'macaroni': 'macaroni.jpg',
    'beef fish': 'beef fish.jpg',
    'ofada sauce': 'ofada sauce.jpg',
    'ofada rice': 'ofada rice.jpg',
    'basmati rice': 'basmati rice.jpg',
    'oyster rice': 'oyster rice.jpg',
    'carbonara rice': 'carbonara rice.jpg',
    'singapore spag': 'singapore spag.jpg',
    'stir fry spag': 'stir fry spag.jpg',
    'chicken sauce': 'chicken sauce.jpg',
    'fish sauce': 'fish sauce.jpg',
    'amala': 'amala.jpg',
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
    'soup': 'soup.jpg',
    'stew': 'stew.jpg',
};

// Define the fixed prices for each food item
const foodItemPrices: Record<string, number> = {
    'jollof rice': 400,
    'white rice': 400,
    'fried rice': 400,
    'porridge beans': 500,
    'white beans': 500,
    'white spag': 400,
    'jollof spag': 400,
    'macaroni': 400,
    'beef fish': 500,
    'egg': 300,
    'eba': 500,
    'semo': 500,
    'pounded yam': 500,
    'amala': 500,
    'fufu': 500,
    'soup': 300,
    'ofada sauce': 300,
    'ofada rice': 400,
    'stew': 200,
    'chicken sauce': 1000,
    'fish sauce': 600,
    'basmati rice': 700,
    'oyster rice': 600,
    'carbonara rice': 700,
    'singapore spag': 500,
    'stir fry spag': 500,
    'moimoi': 500,
    'beef': 400,
    'fish': 400,
    'plantain (3)': 300,
    'chicken': 2500,
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
    if (['jollof rice', 'white rice', 'fried rice', 'porridge yam', 'white beans', 'porridge beans', 'white spag', 'jollof spag', 'macaroni', 'ofada rice', 'basmati rice', 'oyster rice', 'carbonara rice', 'singapore spag', 'stir fry spag'].includes(lowerName)) {
        return 'Main Course';
    }

    // Protein category
    if (['moimoi', 'egg', 'beef', 'fish', 'plantain (3)', 'chicken', 'beef fish', 'chicken sauce', 'fish sauce'].includes(lowerName)) {
        return 'Protein';
    }

    // Swallow category
    if (['eba', 'semo', 'fufu', 'pounded yam', 'amala'].includes(lowerName)) {
        return 'Swallow';
    }

    // Side/Soup category
    if (['afang', 'okro', 'bitter leaf', 'chicken pepper soup', 'ewedu', 'vegetable', 'egusi', 'soup', 'ofada sauce', 'stew'].includes(lowerName)) {
        return 'Side';
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
    const result = await withAuth(async () => {
        try {
            console.log('Starting clear operation for cafeteria:', cafeteriaId);

            const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('seller_id', cafeteriaId)
                .eq('seller_type', 'cafeteria');

            if (error) {
                console.error('Error clearing cafeteria menu:', error);
                // Check if it's an authentication error
                if (error.message.includes('401') || error.message.includes('403') ||
                    error.message.toLowerCase().includes('auth') ||
                    error.message.toLowerCase().includes('permission') ||
                    error.message.toLowerCase().includes('unauthorized')) {
                    console.error('Authentication error during clear operation');
                    return { success: false, error: new Error('Authentication failed. Please sign in again.') };
                }
                return { success: false, error };
            }

            console.log('Cafeteria menu cleared successfully');
            return { success: true };
        } catch (error) {
            console.error('Error clearing cafeteria menu:', error);
            return { success: false, error };
        }
    }, 'clearCafeteriaMenu');

    // If authentication failed (result is null), return an appropriate error response
    if (result === null) {
        return { success: false, error: new Error('Authentication failed. Please sign in again.') };
    }

    return result;
};

// Function to seed cafeteria menu with the requested food items
export const seedCafeteriaMenu = async (cafeteriaId: string): Promise<{ success: boolean; message: string; error?: any }> => {
    const result = await withAuth(async () => {
        try {
            console.log('Starting seed operation for cafeteria:', cafeteriaId);

            // First, clear existing menu items
            const clearResult = await clearCafeteriaMenu(cafeteriaId);
            if (!clearResult.success) {
                return {
                    success: false,
                    message: 'Failed to clear existing menu items: ' + (clearResult.error ? (clearResult.error as Error).message : 'Unknown error'),
                    error: clearResult.error
                };
            }

            console.log('Cleared existing menu items, now adding new ones...');
            // List of all food items to add with exact specifications
            const foodItems = [
                'White Rice',
                'Jollof rice',
                'Fried rice',
                'Porridge beans',
                'White beans',
                'White spag',
                'Jollof spag',
                'Macaroni',
                'Beef fish',
                'Egg',
                'Eba',
                'Semo',
                'Pounded Yam',
                'Amala',
                'Fufu',
                'Soup',
                'Ofada sauce',
                'Ofada rice',
                'Stew',
                'Chicken sauce',
                'Fish sauce',
                'Basmati rice',
                'Oyster rice',
                'Carbonara rice',
                'Singapore spag',
                'Stir fry spag',
                'White spag',
                'Jollof spag',
            ];

            // Remove duplicates while preserving order
            const uniqueFoodItems = Array.from(new Set(foodItems.map(item => item.toLowerCase())))
                .map(name => foodItems.find(item => item.toLowerCase() === name)!)
                .filter(item => item.toLowerCase() !== 'the special soups'); // Remove the generic "special soups" entry

            console.log(`Adding ${uniqueFoodItems.length} unique food items to cafeteria ${cafeteriaId}...`);

            // Process each food item
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
                    // Check if it's an authentication error
                    if (error.message.includes('401') || error.message.includes('403') ||
                        error.message.toLowerCase().includes('auth') ||
                        error.message.toLowerCase().includes('permission') ||
                        error.message.toLowerCase().includes('unauthorized')) {
                        console.error('Authentication error during item insertion');
                        return {
                            success: false,
                            message: 'Authentication failed during menu seeding. Please sign in again.',
                            error: new Error('Authentication failed')
                        };
                    }
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
    }, 'seedCafeteriaMenu');

    // If authentication failed (result is null), return an appropriate error response
    if (result === null) {
        return {
            success: false,
            message: 'Authentication failed during menu seeding. Please sign in again.',
            error: new Error('Authentication failed')
        };
    }

    return result;
};