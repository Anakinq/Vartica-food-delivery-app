import { supabase } from './supabase/client';

export { supabase };

export type UserRole = 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
}

export interface Cafeteria {
  id: string;
  customer_id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  store_name: string;
  description?: string;
  image_url?: string;
  vendor_type: 'student' | 'late_night';
  is_active: boolean;
  available_from?: string;
  available_until?: string;
  created_at: string;
  // Marketplace delivery mode
  delivery_mode: 'self_delivery' | 'pickup_only' | 'agent_delivery' | 'both';
  delivery_fee_self?: number;
  allow_agent_delivery?: boolean;
}

export interface MenuItem {
  id: string;
  seller_id: string;
  seller_type: 'cafeteria' | 'vendor';
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAgent {
  id: string;
  user_id: string;
  vehicle_type?: string;
  is_available: boolean;
  active_orders_count: number;
  total_deliveries: number;
  rating: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  seller_id: string;
  seller_type: 'cafeteria' | 'vendor' | 'late_night_vendor';
  delivery_agent_id?: string;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'ready_for_pickup' | 'picked_up' | 'delivered' | 'cancelled';
  subtotal: number;
  delivery_fee: number;
  delivery_fee_discount?: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'online';
  payment_status: 'pending' | 'paid' | 'failed';
  payment_reference?: string;
  promo_code?: string;
  delivery_address: string;
  delivery_notes?: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  platform_commission?: number;
  agent_earnings?: number;
  // Marketplace delivery handler
  delivery_handler?: 'vendor' | 'agent';
  customer_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
  };
  delivery_agent_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy?: number;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions?: string;
}

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_limit?: number;
  used_count: number;
  created_at: string;
}
