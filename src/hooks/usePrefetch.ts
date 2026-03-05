import { useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Prefetch hook for loading data in the background before navigation
 * This makes the app feel instant by having data ready before the user sees the page
 */
export function usePrefetch() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefetchOrders = useCallback(async (userId: string): Promise<any[] | null> => {
        try {
            const result = await (supabase as any)
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            return result.data;
        } catch (error) {
            console.warn('Prefetch orders failed:', error);
            return null;
        }
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefetchVendorOrders = useCallback(async (vendorId: string): Promise<any[] | null> => {
        try {
            const result = await (supabase as any)
                .from('orders')
                .select('*, order_items(*), user:profiles(*)')
                .eq('vendor_id', vendorId)
                .order('created_at', { ascending: false })
                .limit(20);
            return result.data;
        } catch (error) {
            console.warn('Prefetch vendor orders failed:', error);
            return null;
        }
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefetchDeliveryOrders = useCallback(async (agentId: string): Promise<any[] | null> => {
        try {
            const result = await (supabase as any)
                .from('orders')
                .select('*, user:profiles(*), vendor:vendors(*)')
                .eq('delivery_agent_id', agentId)
                .order('created_at', { ascending: false })
                .limit(20);
            return result.data;
        } catch (error) {
            console.warn('Prefetch delivery orders failed:', error);
            return null;
        }
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prefetchNotifications = useCallback(async (userId: string): Promise<any[] | null> => {
        try {
            const result = await (supabase as any)
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);
            return result.data;
        } catch (error) {
            console.warn('Prefetch notifications failed:', error);
            return null;
        }
    }, []);

    return {
        prefetchOrders,
        prefetchVendorOrders,
        prefetchDeliveryOrders,
        prefetchNotifications
    };
}
