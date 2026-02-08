import { supabase } from '../../lib/supabase/client';

interface VendorWallet {
    id: string;
    vendor_id: string;
    total_earnings: number;
    pending_earnings: number;
    withdrawn_earnings: number;
    created_at: string;
    updated_at: string;
}

interface WalletTransaction {
    id: string;
    vendor_id: string;
    order_id: string | null;
    transaction_type: 'credit' | 'debit' | 'withdrawal';
    amount: number;
    balance_before: number;
    balance_after: number;
    description: string;
    reference_id: string | null;
    created_at: string;
}

interface VendorReview {
    id: string;
    vendor_id: string;
    customer_id: string;
    order_id: string;
    rating: number;
    review_text: string;
    created_at: string;
    updated_at: string;
}

export class VendorWalletService {
    // Get vendor's wallet information
    static async getVendorWallet(vendorId: string): Promise<VendorWallet | null> {
        try {
            const { data, error } = await supabase
                .from('vendor_wallets')
                .select('*')
                .eq('vendor_id', vendorId)
                .single();

            if (error) {
                console.error('Error fetching vendor wallet:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in getVendorWallet:', error);
            return null;
        }
    }

    // Get vendor's transaction history
    static async getWalletTransactions(vendorId: string, limit: number = 20): Promise<WalletTransaction[]> {
        try {
            const { data, error } = await supabase
                .from('vendor_wallet_transactions')
                .select('*')
                .eq('vendor_id', vendorId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching wallet transactions:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getWalletTransactions:', error);
            return [];
        }
    }

    // Get vendor's total earnings from completed orders (alternative calculation method)
    static async calculateVendorEarnings(vendorId: string): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('total, platform_commission')
                .eq('seller_id', vendorId)
                .in('status', ['delivered', 'completed']);

            if (error) {
                console.error('Error calculating vendor earnings:', error);
                return 0;
            }

            if (!data) return 0;

            // Calculate total earnings (total minus platform commission)
            const totalEarnings = data.reduce((sum, order) => {
                const commission = order.platform_commission || 0;
                return sum + (order.total - commission);
            }, 0);

            return totalEarnings;
        } catch (error) {
            console.error('Error in calculateVendorEarnings:', error);
            return 0;
        }
    }

    // Update vendor wallet (for admin operations)
    static async updateVendorWallet(vendorId: string, updates: Partial<VendorWallet>): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('vendor_wallets')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('vendor_id', vendorId);

            if (error) {
                console.error('Error updating vendor wallet:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in updateVendorWallet:', error);
            return false;
        }
    }

    // Get vendor's recent earnings summary
    static async getEarningsSummary(vendorId: string): Promise<{
        totalOrders: number;
        totalRevenue: number;
        totalEarnings: number;
        avgOrderValue: number;
    }> {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('total, platform_commission, status')
                .eq('seller_id', vendorId)
                .in('status', ['delivered', 'completed']);

            if (error) {
                console.error('Error fetching orders for earnings summary:', error);
                return {
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalEarnings: 0,
                    avgOrderValue: 0
                };
            }

            if (!orders || orders.length === 0) {
                return {
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalEarnings: 0,
                    avgOrderValue: 0
                };
            }

            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
            const totalEarnings = orders.reduce((sum, order) => {
                const commission = order.platform_commission || 0;
                return sum + (order.total - commission);
            }, 0);
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            return {
                totalOrders,
                totalRevenue,
                totalEarnings,
                avgOrderValue
            };
        } catch (error) {
            console.error('Error in getEarningsSummary:', error);
            return {
                totalOrders: 0,
                totalRevenue: 0,
                totalEarnings: 0,
                avgOrderValue: 0
            };
        }
    }
}

export class VendorReviewService {
    // Get reviews for a specific vendor
    static async getVendorReviews(vendorId: string, limit: number = 10): Promise<VendorReview[]> {
        try {
            const { data, error } = await supabase
                .from('vendor_reviews')
                .select(`
          *,
          customer:customer_id (
            id,
            full_name
          )
        `)
                .eq('vendor_id', vendorId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching vendor reviews:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in getVendorReviews:', error);
            return [];
        }
    }

    // Get vendor's average rating
    static async getVendorAverageRating(vendorId: string): Promise<number> {
        try {
            const { data, error } = await supabase
                .from('vendor_reviews')
                .select('rating')
                .eq('vendor_id', vendorId);

            if (error) {
                console.error('Error fetching vendor rating:', error);
                return 0;
            }

            if (!data || data.length === 0) return 0;

            const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
            return totalRating / data.length;
        } catch (error) {
            console.error('Error in getVendorAverageRating:', error);
            return 0;
        }
    }

    // Get review count for vendor
    static async getVendorReviewCount(vendorId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('vendor_reviews')
                .select('*', { count: 'exact', head: true })
                .eq('vendor_id', vendorId);

            if (error) {
                console.error('Error fetching review count:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('Error in getVendorReviewCount:', error);
            return 0;
        }
    }

    // Create a new review
    static async createReview(reviewData: {
        vendor_id: string;
        customer_id: string;
        order_id: string;
        rating: number;
        review_text?: string;
    }): Promise<VendorReview | null> {
        try {
            const { data, error } = await supabase
                .from('vendor_reviews')
                .insert([reviewData])
                .select()
                .single();

            if (error) {
                console.error('Error creating review:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in createReview:', error);
            return null;
        }
    }

    // Update existing review
    static async updateReview(reviewId: string, updates: Partial<VendorReview>): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('vendor_reviews')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', reviewId);

            if (error) {
                console.error('Error updating review:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in updateReview:', error);
            return false;
        }
    }

    // Delete review
    static async deleteReview(reviewId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('vendor_reviews')
                .delete()
                .eq('id', reviewId);

            if (error) {
                console.error('Error deleting review:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in deleteReview:', error);
            return false;
        }
    }

    // Check if customer has already reviewed an order
    static async hasCustomerReviewedOrder(customerId: string, orderId: string): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('vendor_reviews')
                .select('id')
                .eq('customer_id', customerId)
                .eq('order_id', orderId)
                .maybeSingle();

            if (error) {
                console.error('Error checking existing review:', error);
                return false;
            }

            return data !== null;
        } catch (error) {
            console.error('Error in hasCustomerReviewedOrder:', error);
            return false;
        }
    }

    // Get vendor's review statistics
    static async getReviewStatistics(vendorId: string): Promise<{
        averageRating: number;
        totalReviews: number;
        ratingDistribution: Record<number, number>;
    }> {
        try {
            const { data, error } = await supabase
                .from('vendor_reviews')
                .select('rating')
                .eq('vendor_id', vendorId);

            if (error) {
                console.error('Error fetching review statistics:', error);
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }

            if (!data || data.length === 0) {
                return {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }

            // Calculate average rating
            const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
            const averageRating = totalRating / data.length;

            // Calculate rating distribution
            const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            data.forEach(review => {
                ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
            });

            return {
                averageRating,
                totalReviews: data.length,
                ratingDistribution
            };
        } catch (error) {
            console.error('Error in getReviewStatistics:', error);
            return {
                averageRating: 0,
                totalReviews: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
        }
    }
}