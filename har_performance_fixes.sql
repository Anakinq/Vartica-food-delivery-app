-- HAR Analysis Performance Fixes
-- This file contains SQL and code recommendations based on HAR log analysis

-- ============================================
-- PART 1: Database Indexes (Already Applied)
-- ============================================
-- The following indexes were found to already exist in the codebase:
-- They are included here for documentation purposes

-- Index for vendor_reviews table (already exists in migrations)
-- CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor_id ON public.vendor_reviews(vendor_id);
-- CREATE INDEX IF NOT EXISTS idx_vendor_reviews_customer_id ON public.vendor_reviews(customer_id);
-- CREATE INDEX IF NOT EXISTS idx_vendor_reviews_order_id ON public.vendor_reviews(order_id);

-- Composite index for rating queries (OPTIMIZATION)
-- This would help with getVendorAverageRating queries
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor_rating 
ON public.vendor_reviews(vendor_id, rating);

-- ============================================
-- PART 2: Performance Recommendations
-- ============================================

-- To reduce the 4-second wait time on auth callback:
-- 1. Add database connection pooling configuration
-- 2. Consider adding a cached_authorization state in profiles table
-- 3. Use Supabase's built-in caching headers

-- ============================================
-- PART 3: API Batching Recommendation
-- ============================================

/*
To implement API batching for vendor reviews, add this method to vendor.service.ts:

static async getMultipleVendorRatings(vendorIds: string[]): Promise<Map<string, {avgRating: number, reviewCount: number}>> {
    try {
        const { data, error } = await supabase
            .from('vendor_reviews')
            .select('vendor_id, rating')
            .in('vendor_id', vendorIds);

        if (error) {
            console.error('Error fetching multiple vendor ratings:', error);
            return new Map();
        }

        // Group by vendor_id and calculate averages
        const results = new Map<string, {avgRating: number, reviewCount: number}>();
        
        if (!data) return results;

        const grouped = data.reduce((acc, review) => {
            if (!acc[review.vendor_id]) {
                acc[review.vendor_id] = [];
            }
            acc[review.vendor_id].push(review.rating);
            return acc;
        }, {});

        for (const [vendorId, ratings] of Object.entries(grouped)) {
            const ratingArray = ratings as number[];
            const avgRating = ratingArray.reduce((a, b) => a + b, 0) / ratingArray.length;
            results.set(vendorId, {
                avgRating,
                reviewCount: ratingArray.length
            });
        }

        return results;
    } catch (error) {
        console.error('Error in getMultipleVendorRatings:', error);
        return new Map();
    }
}

Then update components to use this single API call instead of N individual calls.
*/

-- ============================================
-- PART 4: Security Recommendations
-- ============================================

/*
In vercel.json, update Content-Security-Policy to remove unsafe-eval:

Before:
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co ..."

After (remove 'unsafe-eval'):
"script-src 'self' 'unsafe-inline' https://js.paystack.co ..."

Note: Only remove 'unsafe-eval' if your app doesn't use dynamic code generation 
like eval(), new Function(), or dynamic template literals.
*/
