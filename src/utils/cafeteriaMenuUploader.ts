import { supabase } from '../lib/supabase/client';

interface MenuItem {
    name: string;
    price: number;
    category?: string;
    seller_id: string;
    seller_type: 'cafeteria' | 'vendor' | 'late_night_vendor';
}

/**
 * Uploads cafeteria menu items to the database
 * @param sellerId - The ID of the cafeteria/restaurant
 * @param menuItems - Array of menu items to upload
 * @returns Result of the upload operation
 */
export const uploadCafeteriaMenu = async (
    sellerId: string,
    menuItems: Omit<MenuItem, 'seller_id' | 'seller_type'>[]
): Promise<{ success: boolean; message: string; error?: any }> => {
    try {
        // Prepare items with seller info
        const itemsToInsert = menuItems.map(item => ({
            ...item,
            seller_id: sellerId,
            seller_type: 'cafeteria' as const,
            is_available: true,
        }));

        // Insert all items at once
        const { error } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

        if (error) {
            console.error('Error uploading menu items:', error);
            return {
                success: false,
                message: `Failed to upload menu items: ${error.message}`,
                error
            };
        }

        return {
            success: true,
            message: `${itemsToInsert.length} menu items uploaded successfully!`
        };
    } catch (error) {
        console.error('Unexpected error uploading menu items:', error);
        return {
            success: false,
            message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        };
    }
};

/**
 * Parse menu items from the format provided by the user
 * @param menuText - Raw text containing menu items in the format "Item Name_Price"
 * @returns Array of parsed menu items
 */
export const parseMenuItems = (menuText: string): Omit<MenuItem, 'seller_id' | 'seller_type'>[] => {
    const lines = menuText.trim().split('\n');
    const menuItems: Omit<MenuItem, 'seller_id' | 'seller_type'>[] = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        // Extract name and price from format like "Item Name_Price"
        const match = line.match(/^(.+?)_(\d+)$/);
        if (match) {
            const [, rawName, priceStr] = match;
            const name = rawName.trim().replace(/[\/,]/g, '').trim(); // Remove slashes and commas, trim whitespace
            const price = parseInt(priceStr, 10);

            if (name && !isNaN(price)) {
                // Try to categorize the item based on its name
                let category = 'General';
                const lowerName = name.toLowerCase();

                if (lowerName.includes('rice')) {
                    category = 'Main Course';
                } else if (lowerName.includes('spag') || lowerName.includes('macaroni')) {
                    category = 'Main Course';
                } else if (lowerName.includes('beans') || lowerName.includes('bean')) {
                    category = 'Protein';
                } else if (lowerName.includes('swallow')) {
                    category = 'Swallow';
                } else if (lowerName.includes('soup')) {
                    category = 'Soup';
                } else if (lowerName.includes('stew') || lowerName.includes('sauce')) {
                    category = 'Side';
                } else if (lowerName.includes('chicken')) {
                    category = 'Protein';
                } else if (lowerName.includes('fish') || lowerName.includes('beef')) {
                    category = 'Protein';
                } else if (lowerName.includes('egg')) {
                    category = 'Protein';
                }

                menuItems.push({
                    name,
                    price,
                    category
                });
            }
        }
    }

    return menuItems;
};

/**
 * Helper function to get cafeteria ID by name
 */
export const getCafeteriaIdByName = async (cafeteriaName: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('cafeterias')
        .select('id')
        .eq('name', cafeteriaName)
        .single();

    if (error) {
        console.error(`Error finding cafeteria with name "${cafeteriaName}":`, error);
        return null;
    }

    return data?.id || null;
};

// Example usage:
/*
const cafeteriaName = "Cafeteria 2";
const menuText = `Rice_400
Jollof fried rice_400
Porridge white beans_500
White jollof spag_400
Macaroni_400
Beef fish_500
Egg_300
Swallow_500
Soup_300
Ofada sauce_300
Ofada rice_400
Stew_200
Chicken sauce_1000
Fish sauce_600
Chinese Basmati rice_700
Oyster rice_600
Carbonara rice_700
Singapore & stir fry spag_500
White spag_400
Jollof spag_400
Macaroni_400`;

// Usage example:
const uploadMenu = async () => {
  const cafeteriaId = await getCafeteriaIdByName(cafeteriaName);
  if (!cafeteriaId) {
    console.error('Cafeteria not found');
    return;
  }

  const menuItems = parseMenuItems(menuText);
  const result = await uploadCafeteriaMenu(cafeteriaId, menuItems);
  console.log(result);
};
*/