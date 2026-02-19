/**
 * Extended type definitions for the application
 */

import { Profile, Vendor } from '../lib/supabase';

// Extended profile with additional fields
export interface ExtendedProfile extends Profile {
    hostel_location?: string;
    avatar_url?: string;
    vendor?: Vendor | null;
    vendor_status?: {
        is_active: boolean;
        application_status: string;
    } | null;
}

// Profile with vendor data (used in AuthContext)
export interface ProfileWithVendor extends ExtendedProfile {
    vendor?: Vendor | null;
    vendor_status?: {
        is_active: boolean;
        application_status: string;
    } | null;
}

// Support message interface
export interface SupportMessage {
    id?: string;
    user_id: string;
    user_name: string;
    user_email: string;
    message: string;
    created_at?: string;
    is_resolved?: boolean;
}

// Withdrawal record interface
export interface WithdrawalRecord {
    id: string;
    agent_id: string;
    amount: number;
    status: 'pending' | 'pending_approval' | 'processing' | 'completed' | 'failed';
    created_at: string;
    updated_at: string;
    processed_at?: string;
    error_message?: string;
    paystack_transfer_code?: string;
    paystack_transfer_reference?: string;
    approved_by?: string;
    approved_at?: string;
    admin_notes?: string;
    sent_at?: string;
}

// Wallet balance interface
export interface WalletBalance {
    food_wallet_balance: string;
    earnings_wallet_balance: string;
}

// Payout profile interface
export interface PayoutProfile {
    bank_code: string;
    account_number: string;
    account_name: string;
    verified: boolean;
}

// Withdrawal request interface
export interface WithdrawalRequest {
    amount: number;
}

// Bank verification request interface
export interface BankVerificationRequest {
    account_number: string;
    bank_code: string;
}

// Toast message interface
export interface Toast {
    id: number;
    message: string;
    isVisible: boolean;
}

// Cart item interface
export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
    seller_id: string;
    seller_type: 'cafeteria' | 'vendor' | 'late_night_vendor';
    description?: string;
    category?: string;
    is_available?: boolean;
    created_at?: string;
    updated_at?: string;
}

// Location data interface
export interface LocationData {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
}

// Order status type
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'shipped' | 'delivered' | 'cancelled';

// Seller type
export type SellerType = 'cafeteria' | 'vendor' | 'late_night_vendor';

// Role type
export type UserRole = 'customer' | 'cafeteria' | 'vendor' | 'late_night_vendor' | 'delivery_agent' | 'admin';

// Vendor type
export type VendorType = 'student' | 'late_night';

// Delivery option type
export type DeliveryOption = 'offers_hostel_delivery' | 'does_not_offer_hostel_delivery';