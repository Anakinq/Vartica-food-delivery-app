// src/lib/db.ts
// Database helper functions with proper typing workarounds
// This file provides typed wrappers around Supabase queries

import { supabase } from './supabase';

// Cast supabase to any to avoid strict TypeScript issues with PostgREST
const db = supabase as any;

/**
 * Cafeteria queries
 */
export const dbCafeterias = {
    getAll: async () => {
        const { data, error } = await db
            .from('cafeterias')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        return data;
    },
    getById: async (id: string) => {
        const { data, error } = await db
            .from('cafeterias')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
};

/**
 * Vendor queries
 */
export const dbVendors = {
    getAll: async () => {
        const { data, error } = await db
            .from('vendors')
            .select('*')
            .eq('is_active', true)
            .order('store_name');
        if (error) throw error;
        return data;
    },
    getByType: async (type: string) => {
        const { data, error } = await db
            .from('vendors')
            .select('*')
            .eq('is_active', true)
            .eq('vendor_type', type)
            .order('store_name');
        if (error) throw error;
        return data;
    },
    getById: async (id: string) => {
        const { data, error } = await db
            .from('vendors')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
};

/**
 * Menu item queries
 */
export const dbMenuItems = {
    getBySeller: async (sellerId: string, sellerType: string) => {
        const { data, error } = await db
            .from('menu_items')
            .select('*')
            .eq('seller_id', sellerId)
            .eq('seller_type', sellerType)
            .eq('is_available', true)
            .order('name');
        if (error) throw error;
        return data;
    },
};

/**
 * Order queries
 */
export const dbOrders = {
    getByUser: async (userId: string, limit = 50) => {
        const { data, error } = await db
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },
    getByVendor: async (vendorId: string, limit = 50) => {
        const { data, error } = await db
            .from('orders')
            .select('*, order_items(*), user:profiles(*)')
            .eq('vendor_id', vendorId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },
    getByDeliveryAgent: async (agentId: string, limit = 50) => {
        const { data, error } = await db
            .from('orders')
            .select('*, user:profiles(*), vendor:vendors(*)')
            .eq('delivery_agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },
};

/**
 * Wallet queries
 */
export const dbWallet = {
    getByUser: async (userId: string) => {
        const { data, error } = await db
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        return data;
    },
    getByAgent: async (agentId: string) => {
        const { data, error } = await db
            .from('delivery_agent_wallets')
            .select('*')
            .eq('agent_id', agentId)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },
};

/**
 * Notification queries
 */
export const dbNotifications = {
    getByUser: async (userId: string, limit = 30) => {
        const { data, error } = await db
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },
};

/**
 * Profile queries
 */
export const dbProfiles = {
    getById: async (id: string) => {
        const { data, error } = await db
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
};

/**
 * Banner queries
 */
export const dbBanners = {
    getActive: async () => {
        const { data, error } = await db
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        if (error) throw error;
        return data;
    },
};

/**
 * Withdrawal queries
 */
export const dbWithdrawals = {
    getByUser: async (userId: string, limit = 20) => {
        const { data, error } = await db
            .from('withdrawals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },
    getByAgent: async (agentId: string, limit = 20) => {
        const { data, error } = await db
            .from('delivery_agent_withdrawals')
            .select('*')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },
};

export default {
    dbCafeterias,
    dbVendors,
    dbMenuItems,
    dbOrders,
    dbWallet,
    dbNotifications,
    dbProfiles,
    dbBanners,
    dbWithdrawals,
};
