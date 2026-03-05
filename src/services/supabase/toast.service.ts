import { supabase } from '../../lib/supabase/client';

// Toast Vendor interface
export interface ToastVendor {
    id: string;
    user_id?: string;
    name: string;
    hostel_location: string;
    phone?: string;
    photo_url?: string;
    price: number;
    extras: {
        butter?: number;
        egg?: number;
        tea?: number;
    };
    is_open: boolean;
    rating: number;
    total_ratings: number;
    is_approved?: boolean;
    created_at?: string;
    updated_at?: string;
}

// Toast Order interface
export interface ToastOrder {
    id: string;
    vendor_id: string;
    user_id?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_hostel?: string;
    quantity: number;
    extras: {
        butter?: boolean;
        egg?: boolean;
        tea?: boolean;
    };
    subtotal: number;
    delivery_fee: number;
    total_price: number;
    status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    notes?: string;
    created_at?: string;
    updated_at?: string;
    // Joined data
    vendor?: ToastVendor;
}

// Hostel with vendor count
export interface HostelWithVendors {
    hostel_location: string;
    vendor_count: number;
    vendors: ToastVendor[];
}

// Toast Service class
export class ToastService {
    // Get all hostels with toast vendors
    static async getHostelsWithVendors(): Promise<HostelWithVendors[]> {
        const { data: vendors, error } = await supabase
            .from('toast_vendors')
            .select('*')
            .eq('is_approved', true)
            .eq('is_open', true)
            .order('rating', { ascending: false });

        if (error) throw error;

        // Group by hostel
        const hostelsMap = new Map<string, ToastVendor[]>();

        vendors?.forEach(vendor => {
            const existing = hostelsMap.get(vendor.hostel_location) || [];
            hostelsMap.set(vendor.hostel_location, [...existing, vendor]);
        });

        // Convert to array and sort by vendor count
        const hostels: HostelWithVendors[] = Array.from(hostelsMap.entries())
            .map(([location, vends]) => ({
                hostel_location: location,
                vendor_count: vends.length,
                vendors: vends
            }))
            .sort((a, b) => b.vendor_count - a.vendor_count);

        return hostels;
    }

    // Get vendors by hostel
    static async getVendorsByHostel(hostelLocation: string): Promise<ToastVendor[]> {
        const { data, error } = await supabase
            .from('toast_vendors')
            .select('*')
            .eq('hostel_location', hostelLocation)
            .eq('is_approved', true)
            .order('rating', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Get single vendor
    static async getVendor(vendorId: string): Promise<ToastVendor | null> {
        const { data, error } = await supabase
            .from('toast_vendors')
            .select('*')
            .eq('id', vendorId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    // Get my toast vendor profile (for vendors)
    static async getMyVendorProfile(): Promise<ToastVendor | null> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('toast_vendors')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    }

    // Register as toast vendor
    static async registerVendor(vendorData: Partial<ToastVendor>): Promise<ToastVendor> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('toast_vendors')
            .insert({
                ...vendorData,
                user_id: user.id,
                is_approved: true // Auto-approve for now
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Update my vendor profile
    static async updateMyProfile(updates: Partial<ToastVendor>): Promise<ToastVendor> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('toast_vendors')
            .update(updates)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Toggle open/closed status
    static async toggleOpen(isOpen: boolean): Promise<ToastVendor> {
        return this.updateMyProfile({ is_open: isOpen });
    }

    // Create toast order
    static async createOrder(orderData: {
        vendor_id: string;
        quantity: number;
        extras: { butter?: boolean; egg?: boolean; tea?: boolean };
        notes?: string;
    }): Promise<ToastOrder> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get vendor details for price calculation
        const vendor = await this.getVendor(orderData.vendor_id);
        if (!vendor) throw new Error('Vendor not found');

        // Calculate price
        let subtotal = vendor.price * orderData.quantity;
        const extras = vendor.extras || {};

        if (orderData.extras.egg) subtotal += (extras.egg || 200) * orderData.quantity;
        if (orderData.extras.tea) subtotal += (extras.tea || 300) * orderData.quantity;
        if (orderData.extras.butter) subtotal += (extras.butter || 100) * orderData.quantity;

        // Get user's profile for delivery info
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, hostel_location')
            .eq('id', user.id)
            .single();

        const deliveryFee = 100; // Standard delivery fee
        const totalPrice = subtotal + deliveryFee;

        const { data, error } = await supabase
            .from('toast_orders')
            .insert({
                vendor_id: orderData.vendor_id,
                user_id: user.id,
                customer_name: profile?.full_name || 'Customer',
                customer_phone: profile?.phone || '',
                customer_hostel: profile?.hostel_location || '',
                quantity: orderData.quantity,
                extras: orderData.extras,
                subtotal,
                delivery_fee: deliveryFee,
                total_price: totalPrice,
                status: 'pending',
                payment_status: 'pending',
                notes: orderData.notes || ''
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Get my orders (as customer)
    static async getMyOrders(): Promise<ToastOrder[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('toast_orders')
            .select('*, vendor:toast_vendors(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Get vendor orders (as vendor)
    static async getVendorOrders(): Promise<ToastOrder[]> {
        const myVendor = await this.getMyVendorProfile();
        if (!myVendor) return [];

        const { data, error } = await supabase
            .from('toast_orders')
            .select('*, vendor:toast_vendors(*)')
            .eq('vendor_id', myVendor.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Update order status (vendor only)
    static async updateOrderStatus(orderId: string, status: ToastOrder['status']): Promise<ToastOrder> {
        const myVendor = await this.getMyVendorProfile();
        if (!myVendor) throw new Error('Not a toast vendor');

        const { data, error } = await supabase
            .from('toast_orders')
            .update({ status })
            .eq('id', orderId)
            .eq('vendor_id', myVendor.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Get all open vendors (for "near you" feature)
    static async getAllOpenVendors(): Promise<ToastVendor[]> {
        const { data, error } = await supabase
            .from('toast_vendors')
            .select('*')
            .eq('is_approved', true)
            .eq('is_open', true)
            .order('rating', { ascending: false });

        if (error) throw error;
        return data || [];
    }
}

export default ToastService;
