// Customer Wallet Service
// Handles all wallet operations for customers

import { supabase } from '../../lib/supabase/client';

export interface CustomerWallet {
    id: string;
    user_id: string;
    balance: number;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    order_id: string | null;
    transaction_type: 'credit' | 'debit' | 'refund';
    amount: number;
    balance_before: number;
    balance_after: number;
    payment_reference: string | null;
    description: string | null;
    created_at: string;
}

export interface TopUpResult {
    success: boolean;
    new_balance: number;
    transaction_id: string;
}

export interface DeductResult {
    success: boolean;
    new_balance: number;
    transaction_id: string;
}

export interface RefundResult {
    success: boolean;
    message: string;
    refunded_amount: number;
}

export class CustomerWalletService {
    /**
     * Get customer's wallet balance
     */
    static async getWallet(userId: string): Promise<CustomerWallet | null> {
        try {
            // First try RPC
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_wallet', {
                p_user_id: userId
            });

            if (!rpcError && rpcData && rpcData.length > 0) {
                return rpcData[0] as CustomerWallet;
            }

            // Fallback to direct query
            const { data, error } = await supabase
                .from('customer_wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error fetching wallet:', error);
            return null;
        }
    }

    /**
     * Top up wallet (add funds)
     */
    static async topUp(
        userId: string,
        amount: number,
        paymentReference: string,
        description?: string
    ): Promise<TopUpResult> {
        try {
            const { data, error } = await supabase.rpc('top_up_wallet', {
                p_user_id: userId,
                p_amount: amount,
                p_payment_reference: paymentReference,
                p_description: description || 'Wallet top-up'
            });

            if (error) throw error;

            if (data && data.length > 0) {
                return {
                    success: data[0].success,
                    new_balance: parseFloat(data[0].new_balance),
                    transaction_id: data[0].transaction_id
                };
            }

            return { success: false, new_balance: 0, transaction_id: '' };
        } catch (error) {
            console.error('Error topping up wallet:', error);
            throw error;
        }
    }

    /**
     * Deduct from wallet (order payment)
     */
    static async deduct(
        userId: string,
        amount: number,
        orderId: string,
        description?: string
    ): Promise<DeductResult> {
        try {
            const { data, error } = await supabase.rpc('deduct_wallet_balance', {
                p_user_id: userId,
                p_amount: amount,
                p_order_id: orderId,
                p_description: description || 'Order payment'
            });

            if (error) throw error;

            if (data && data.length > 0) {
                return {
                    success: data[0].success,
                    new_balance: parseFloat(data[0].new_balance),
                    transaction_id: data[0].transaction_id
                };
            }

            return { success: false, new_balance: 0, transaction_id: '' };
        } catch (error) {
            console.error('Error deducting from wallet:', error);
            throw error;
        }
    }

    /**
     * Refund order to wallet
     */
    static async refundOrder(orderId: string, reason?: string): Promise<RefundResult> {
        try {
            const { data, error } = await supabase.rpc('refund_order_to_wallet', {
                p_order_id: orderId,
                p_refund_reason: reason || 'Order cancelled/returned'
            });

            if (error) throw error;

            if (data && data.length > 0) {
                return {
                    success: data[0].success,
                    message: data[0].message,
                    refunded_amount: parseFloat(data[0].refunded_amount)
                };
            }

            return { success: false, message: 'Unknown error', refunded_amount: 0 };
        } catch (error) {
            console.error('Error refunding order:', error);
            throw error;
        }
    }

    /**
     * Get transaction history
     */
    static async getTransactions(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<WalletTransaction[]> {
        try {
            // Try RPC first
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_customer_transactions', {
                p_user_id: userId,
                p_limit: limit,
                p_offset: offset
            });

            if (!rpcError && rpcData) {
                return rpcData as WalletTransaction[];
            }

            // Fallback to direct query
            const { data, error } = await supabase
                .from('customer_wallet_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    /**
     * Get transaction for specific order
     */
    static async getOrderTransaction(orderId: string): Promise<WalletTransaction | null> {
        try {
            const { data, error } = await supabase.rpc('get_order_transaction', {
                p_order_id: orderId
            });

            if (error) throw error;

            if (data && data.length > 0) {
                return data[0] as WalletTransaction;
            }

            return null;
        } catch (error) {
            console.error('Error fetching order transaction:', error);
            return null;
        }
    }

    /**
     * Generate delivery PIN for an order
     */
    static async generateDeliveryPin(orderId: string): Promise<string | null> {
        try {
            const { data, error } = await supabase.rpc('generate_delivery_pin', {
                p_order_id: orderId
            });

            if (error) throw error;

            if (data && data.length > 0 && data[0].success) {
                return data[0].delivery_pin;
            }

            return null;
        } catch (error) {
            console.error('Error generating delivery PIN:', error);
            return null;
        }
    }

    /**
     * Verify delivery PIN
     */
    static async verifyDeliveryPin(orderId: string, pin: string): Promise<boolean> {
        try {
            const { data, error } = await supabase.rpc('verify_delivery_pin', {
                p_order_id: orderId,
                p_pin: pin
            });

            if (error) throw error;

            return data || false;
        } catch (error) {
            console.error('Error verifying delivery PIN:', error);
            return false;
        }
    }

    /**
     * Check if order was paid via wallet
     */
    static async wasPaidViaWallet(orderId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('payment_method, payment_reference')
                .eq('id', orderId)
                .single();

            if (error) return false;

            // Check if payment_method contains 'wallet' or if there's a wallet transaction
            if (data?.payment_method === 'wallet') {
                return true;
            }

            // Check wallet transactions for this order
            const transaction = await this.getOrderTransaction(orderId);
            return transaction !== null;
        } catch (error) {
            console.error('Error checking payment method:', error);
            return false;
        }
    }

    /**
     * Calculate if wallet can cover order total
     */
    static async canAffordOrder(userId: string, amount: number): Promise<boolean> {
        const wallet = await this.getWallet(userId);
        return wallet ? wallet.balance >= amount : false;
    }
}

export default CustomerWalletService;