// src/hooks/useQueries.ts
// React Query hooks for efficient data caching and deduplication
// This replaces the custom dataCache with proper request deduplication

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    dbCafeterias,
    dbVendors,
    dbMenuItems,
    dbOrders,
    dbWallet,
    dbNotifications,
    dbProfiles,
    dbBanners,
    dbWithdrawals
} from '../lib/db';

/**
 * Cache timeouts (in milliseconds)
 * - cafeterias, vendors: 10 minutes (less frequent changes)
 * - menus: 5 minutes (moderately frequent)
 * - orders, wallet: 30 seconds (frequently changing)
 * - notifications: 1 minute
 */
const CACHE_TIMES = {
    cafeterias: 10 * 60 * 1000,
    vendors: 10 * 60 * 1000,
    menus: 5 * 60 * 1000,
    orders: 30 * 1000,
    wallet: 30 * 1000,
    notifications: 60 * 1000,
    profile: 5 * 60 * 1000,
    banners: 10 * 60 * 1000,
};

// ==================== CAFETERIA QUERIES ====================

/**
 * Get all active cafeterias
 */
export function useCafeterias() {
    return useQuery({
        queryKey: ['cafeterias'],
        queryFn: dbCafeterias.getAll,
        staleTime: CACHE_TIMES.cafeterias,
        gcTime: CACHE_TIMES.cafeterias * 2,
    });
}

/**
 * Get single cafeteria by ID
 */
export function useCafeteria(id: string | null) {
    return useQuery({
        queryKey: ['cafeteria', id],
        queryFn: () => dbCafeterias.getById(id!),
        enabled: !!id,
        staleTime: CACHE_TIMES.cafeterias,
    });
}

// ==================== VENDOR QUERIES ====================

/**
 * Get all active vendors
 */
export function useVendors() {
    return useQuery({
        queryKey: ['vendors'],
        queryFn: dbVendors.getAll,
        staleTime: CACHE_TIMES.vendors,
        gcTime: CACHE_TIMES.vendors * 2,
    });
}

/**
 * Get vendors by type
 */
export function useVendorsByType(type: 'student' | 'late_night' | 'vendor') {
    return useQuery({
        queryKey: ['vendors', type],
        queryFn: () => dbVendors.getByType(type),
        staleTime: CACHE_TIMES.vendors,
    });
}

/**
 * Get single vendor by ID
 */
export function useVendor(id: string | null) {
    return useQuery({
        queryKey: ['vendor', id],
        queryFn: () => dbVendors.getById(id!),
        enabled: !!id,
        staleTime: CACHE_TIMES.vendors,
    });
}

// ==================== MENU QUERIES ====================

/**
 * Get menu items for a seller
 */
export function useMenuItems(sellerId: string | null, sellerType: string | null) {
    return useQuery({
        queryKey: ['menu', sellerId, sellerType],
        queryFn: () => dbMenuItems.getBySeller(sellerId!, sellerType!),
        enabled: !!sellerId && !!sellerType,
        staleTime: CACHE_TIMES.menus,
    });
}

// ==================== ORDER QUERIES ====================

/**
 * Get user's orders
 */
export function useUserOrders(userId: string | null) {
    return useQuery({
        queryKey: ['orders', userId],
        queryFn: () => dbOrders.getByUser(userId!),
        enabled: !!userId,
        staleTime: CACHE_TIMES.orders,
    });
}

/**
 * Get vendor's orders
 */
export function useVendorOrders(vendorId: string | null) {
    return useQuery({
        queryKey: ['vendor-orders', vendorId],
        queryFn: () => dbOrders.getByVendor(vendorId!),
        enabled: !!vendorId,
        staleTime: CACHE_TIMES.orders,
    });
}

/**
 * Get delivery agent's orders
 */
export function useDeliveryOrders(agentId: string | null) {
    return useQuery({
        queryKey: ['delivery-orders', agentId],
        queryFn: () => dbOrders.getByDeliveryAgent(agentId!),
        enabled: !!agentId,
        staleTime: CACHE_TIMES.orders,
    });
}

// ==================== CUSTOMER WALLET QUERIES ====================

/**
 * Get customer's wallet (new customer wallet system)
 */
export function useCustomerWallet(userId: string | null) {
    return useQuery({
        queryKey: ['customer-wallet', userId],
        queryFn: () => {
            if (!userId) return Promise.resolve(null);
            // Import dynamically to avoid circular dependencies
            return import('../../services/supabase/customer-wallet.service').then(
                m => m.CustomerWalletService.getWallet(userId)
            );
        },
        enabled: !!userId,
        staleTime: CACHE_TIMES.wallet,
    });
}

/**
 * Get customer's wallet transactions
 */
export function useCustomerWalletTransactions(userId: string | null, limit: number = 20) {
    return useQuery({
        queryKey: ['customer-wallet-transactions', userId, limit],
        queryFn: () => {
            if (!userId) return Promise.resolve([]);
            return import('../../services/supabase/customer-wallet.service').then(
                m => m.CustomerWalletService.getTransactions(userId, limit, 0)
            );
        },
        enabled: !!userId,
        staleTime: CACHE_TIMES.wallet,
    });
}

/**
 * Get delivery agent's wallet
 */
export function useAgentWallet(agentId: string | null) {
    return useQuery({
        queryKey: ['agent-wallet', agentId],
        queryFn: () => dbWallet.getByAgent(agentId!),
        enabled: !!agentId,
        staleTime: CACHE_TIMES.wallet,
    });
}

// ==================== NOTIFICATION QUERIES ====================

/**
 * Get user's notifications
 */
export function useNotifications(userId: string | null) {
    return useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => dbNotifications.getByUser(userId!),
        enabled: !!userId,
        staleTime: CACHE_TIMES.notifications,
    });
}

// ==================== PROFILE QUERIES ====================

/**
 * Get user profile
 */
export function useProfile(userId: string | null) {
    return useQuery({
        queryKey: ['profile', userId],
        queryFn: () => dbProfiles.getById(userId!),
        enabled: !!userId,
        staleTime: CACHE_TIMES.profile,
    });
}

// ==================== BANNER QUERIES ====================

/**
 * Get active banners
 */
export function useBanners() {
    return useQuery({
        queryKey: ['banners'],
        queryFn: dbBanners.getActive,
        staleTime: CACHE_TIMES.banners,
    });
}

// ==================== WITHDRAWAL QUERIES ====================

/**
 * Get user's withdrawals
 */
export function useWithdrawals(userId: string | null) {
    return useQuery({
        queryKey: ['withdrawals', userId],
        queryFn: () => dbWithdrawals.getByUser(userId!),
        enabled: !!userId,
        staleTime: CACHE_TIMES.orders,
    });
}

/**
 * Get delivery agent's withdrawals
 */
export function useAgentWithdrawals(agentId: string | null) {
    return useQuery({
        queryKey: ['agent-withdrawals', agentId],
        queryFn: () => dbWithdrawals.getByAgent(agentId!),
        enabled: !!agentId,
        staleTime: CACHE_TIMES.orders,
    });
}

// ==================== UTILITY HOOKS ====================

/**
 * Invalidate all queries related to a specific key
 * Use after mutations to refresh data
 */
export function useInvalidateQueries() {
    const queryClient = useQueryClient();

    return {
        invalidateCafeterias: () => queryClient.invalidateQueries({ queryKey: ['cafeterias'] }),
        invalidateVendors: () => queryClient.invalidateQueries({ queryKey: ['vendors'] }),
        invalidateMenu: (sellerId?: string) => {
            if (sellerId) {
                queryClient.invalidateQueries({ queryKey: ['menu', sellerId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['menu'] });
            }
        },
        invalidateOrders: (userId?: string) => {
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['orders', userId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['orders'] });
            }
        },
        invalidateWallet: (userId?: string) => {
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
            } else {
                queryClient.invalidateQueries({ queryKey: ['wallet'] });
            }
        },
        invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        invalidateProfile: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
        invalidateAll: () => queryClient.invalidateQueries(),
    };
}

/**
 * Prefetch data for faster navigation
 * Can be called on hover/button mouseEnter
 */
export function usePrefetchData() {
    const queryClient = useQueryClient();

    return {
        prefetchCafeterias: () => queryClient.prefetchQuery({
            queryKey: ['cafeterias'],
            queryFn: dbCafeterias.getAll,
        }),
        prefetchVendors: () => queryClient.prefetchQuery({
            queryKey: ['vendors'],
            queryFn: dbVendors.getAll,
        }),
        prefetchOrders: (userId: string) => queryClient.prefetchQuery({
            queryKey: ['orders', userId],
            queryFn: () => dbOrders.getByUser(userId, 20),
        }),
    };
}

export default {
    useCafeterias,
    useCafeteria,
    useVendors,
    useVendorsByType,
    useVendor,
    useMenuItems,
    useUserOrders,
    useVendorOrders,
    useDeliveryOrders,
    useWallet,
    useAgentWallet,
    useNotifications,
    useProfile,
    useBanners,
    useWithdrawals,
    useAgentWithdrawals,
    useInvalidateQueries,
    usePrefetchData,
};
