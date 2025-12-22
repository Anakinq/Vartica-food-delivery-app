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
    'french': 'fanta.jpg', // Placeholder - no specific french fries image
    'sardine': 'fried fish.jpg', // Placeholder - using fish image
    'syrup': 'maple syrup.jpg',
    'afang': 'afang soup.jpg',
    'okro': 'okro soup.jpg',
    'bitter leaf': 'bitter leaf soup.jpg',
    'chicken pepper soup': 'chicken pepper soup.jpg',
    'ewedu': 'ewedu.jpg',
    'vegetable': 'vegetable soup.jpg',
    'egusi': 'egusi soup.jpg',
};

// Define categories for different food types
const categorizeFood = (foodName: string): string => {
    const lowerName = foodName.toLowerCase();

    // Main dishes
    if (lowerName.includes('rice') || lowerName.includes('spag') || lowerName.includes('yam') ||
        lowerName.includes('beans') || lowerName.includes('indomie')) {
        return 'Main Course';
    }

    // Swallow foods
    if (lowerName.includes('eba') || lowerName.includes('semo') || lowerName.includes('fufu') ||
        lowerName.includes('pounded yam')) {
        return 'Swallow';
    }

    // Proteins
    if (lowerName.includes('egg') || lowerName.includes('beef') || lowerName.includes('fish') ||
        lowerName.includes('chicken') || lowerName.includes('ponmo')) {
        return 'Protein';
    }

    // Soups
    if (lowerName.includes('soup') || lowerName.includes('afang') || lowerName.includes('okro') ||
        lowerName.includes('bitter leaf') || lowerName.includes('ewedu') || lowerName.includes('egusi') ||
        lowerName.includes('vegetable')) {
        return 'Soup';
    }

    // Snacks
    if (lowerName.includes('pancake') || lowerName.includes('waffles') || lowerName.includes('toast') ||
        lowerName.includes('shawarma') || lowerName.includes('sardine') || lowerName.includes('french')) {
        return 'Snack';
    }

    // Drinks/Syrups
    if (lowerName.includes('syrup')) {
        return 'Drink';
    }

    // Default category
    return 'Main Course';
};

// Generate a price based on the food type
const generatePrice = (foodName: string): number => {
    const lowerName = foodName.toLowerCase();

    // Main dishes are more expensive
    if (lowerName.includes('rice') || lowerName.includes('spag') || lowerName.includes('yam') ||
        lowerName.includes('beans') || lowerName.includes('indomie')) {
        return Math.floor(Math.random() * 300) + 400; // 400-700
    }

    // Proteins are medium cost
    if (lowerName.includes('egg') || lowerName.includes('beef') || lowerName.includes('fish') ||
        lowerName.includes('chicken') || lowerName.includes('ponmo')) {
        return Math.floor(Math.random() * 200) + 200; // 200-400
    }

    // Soups and snacks are cheaper
    if (lowerName.includes('soup') || lowerName.includes('pancake') || lowerName.includes('waffles') ||
        lowerName.includes('toast') || lowerName.includes('shawarma')) {
        return Math.floor(Math.random() * 150) + 150; // 150-300
    }

    // Default price
    return Math.floor(Math.random() * 200) + 100; // 100-300
};

// Function to seed cafeteria menu with the requested food items
export const seedCafeteriaMenu = async (cafeteriaId: string): Promise<{ success: boolean; message: string; error?: any }> => {
    try {
        // List of all food items to add
        const foodItems = [
            'Jollof Rice',
            'White Rice',
            'Fried Rice',
            'Porridge Yam',
            'White Beans',
            'Porridge Beans',
            'White Spag',
            'White Spag', // Added twice as requested
            'Moimoi',
            'Egg',
            'Beef',
            'Fish',
            'Plantain',
            'Chicken',
            'Eba',
            'Semo',
            'Fufu',
            'Pounded Yam',
            'Pancake',
            'Waffles',
            'Ponmo',
            'Egg', // Added twice as requested
            'Indomie',
            'Shawarma',
            'Toast',
            'French',
            'Egg', // Added third time as requested
            'Chicken',
            'Sardine',
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

            const price = generatePrice(foodName);
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