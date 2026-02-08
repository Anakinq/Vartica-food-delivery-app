// src/services/favoritesService.ts
import { supabase } from '../lib/supabase/client';

export interface FavoriteItem {
    menu_item_id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category: string | null;
    seller_id: string;
    seller_type: string;
    is_available: boolean;
    favorited_at: string;
}

/**
 * Get user's favorite menu items
 */
export const getUserFavorites = async (): Promise<FavoriteItem[]> => {
    try {
        const { data, error } = await supabase.rpc('get_user_favorites');

        if (error) {
            console.error('Error fetching favorites:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getUserFavorites:', error);
        return [];
    }
};

/**
 * Toggle favorite status for a menu item
 * @param menuItemId - The ID of the menu item to toggle
 * @returns boolean - True if item was added to favorites, false if removed
 */
export const toggleFavorite = async (menuItemId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc('toggle_favorite', {
            p_menu_item_id: menuItemId
        });

        if (error) {
            console.error('Error toggling favorite:', error);
            throw new Error(error.message);
        }

        return data || false;
    } catch (error) {
        console.error('Error in toggleFavorite:', error);
        throw error;
    }
};

/**
 * Check if a menu item is favorited by the current user
 * @param menuItemId - The ID of the menu item to check
 * @returns boolean - True if item is favorited
 */
export const isFavorited = async (menuItemId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('menu_item_id', menuItemId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
            console.error('Error checking favorite status:', error);
        }

        return !!data;
    } catch (error) {
        console.error('Error in isFavorited:', error);
        return false;
    }
};

/**
 * Get favorite status for multiple menu items
 * @param menuItemIds - Array of menu item IDs to check
 * @returns Record<string, boolean> - Object mapping item IDs to favorite status
 */
export const getFavoritesBatch = async (menuItemIds: string[]): Promise<Record<string, boolean>> => {
    try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return {};

        const { data, error } = await supabase
            .from('favorites')
            .select('menu_item_id')
            .eq('user_id', userId)
            .in('menu_item_id', menuItemIds);

        if (error) {
            console.error('Error fetching batch favorites:', error);
            return {};
        }

        const favoritesMap: Record<string, boolean> = {};
        menuItemIds.forEach(id => {
            favoritesMap[id] = false;
        });

        data?.forEach(fav => {
            favoritesMap[fav.menu_item_id] = true;
        });

        return favoritesMap;
    } catch (error) {
        console.error('Error in getFavoritesBatch:', error);
        return {};
    }
};