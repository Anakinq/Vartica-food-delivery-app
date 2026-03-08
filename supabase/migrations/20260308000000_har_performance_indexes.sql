-- HAR Performance Optimization - Database Indexes
-- This migration adds optimized indexes for the vendor reviews table
-- to improve query performance after HAR analysis

-- Composite index for vendor rating queries (vendor_id + rating)
-- This optimizes getVendorAverageRating and getMultipleVendorRatings
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor_rating 
ON public.vendor_reviews(vendor_id, rating);

-- Index for customer review lookups
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_customer_created 
ON public.vendor_reviews(customer_id, created_at DESC);

-- Index for order review lookups (prevents duplicate reviews)
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_order_unique 
ON public.vendor_reviews(order_id) WHERE order_id IS NOT NULL;

-- Comment explaining the indexes
COMMENT ON INDEX idx_vendor_reviews_vendor_rating IS 'HAR optimization: Improves batch vendor rating queries';
