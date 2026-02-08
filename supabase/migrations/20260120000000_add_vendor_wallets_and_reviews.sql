-- Add vendor wallets and reviews system - FIXED VERSION
-- This migration creates tables for vendor financial tracking and customer review management

-- 1. Create vendor_wallets table
CREATE TABLE IF NOT EXISTS public.vendor_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    total_earnings NUMERIC(10,2) DEFAULT 0.00,
    pending_earnings NUMERIC(10,2) DEFAULT 0.00,
    withdrawn_earnings NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_wallets_vendor_id ON public.vendor_wallets(vendor_id);

-- Enable Row Level Security
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_wallets
CREATE POLICY "Vendors can view their own wallet" ON public.vendor_wallets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendors v 
            WHERE v.id = vendor_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "Vendors can update their own wallet" ON public.vendor_wallets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendors v 
            WHERE v.id = vendor_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert vendor wallets" ON public.vendor_wallets
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 2. Create vendor_reviews table
CREATE TABLE IF NOT EXISTS public.vendor_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_vendor_id ON public.vendor_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_customer_id ON public.vendor_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_reviews_order_id ON public.vendor_reviews(order_id);

-- Enable Row Level Security
ALTER TABLE public.vendor_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_reviews
CREATE POLICY "Anyone can view vendor reviews" ON public.vendor_reviews
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "Customers can create reviews for their orders" ON public.vendor_reviews
    FOR INSERT TO authenticated
    USING (
        auth.uid() = customer_id
        AND EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_id 
            AND o.customer_id = auth.uid()
            AND o.status = 'delivered'
        )
    );

CREATE POLICY "Customers can update their own reviews" ON public.vendor_reviews
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = customer_id
    );

CREATE POLICY "Customers can delete their own reviews" ON public.vendor_reviews
    FOR DELETE TO authenticated
    USING (
        auth.uid() = customer_id
    );

-- 3. Create wallet_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.vendor_wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'withdrawal')),
    amount NUMERIC(10,2) NOT NULL,
    balance_before NUMERIC(10,2) NOT NULL,
    balance_after NUMERIC(10,2) NOT NULL,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vendor_wallet_transactions_vendor_id ON public.vendor_wallet_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_wallet_transactions_order_id ON public.vendor_wallet_transactions(order_id);

-- Enable Row Level Security
ALTER TABLE public.vendor_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor_wallet_transactions
CREATE POLICY "Vendors can view their own transactions" ON public.vendor_wallet_transactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.vendors v 
            WHERE v.id = vendor_id AND v.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert transactions" ON public.vendor_wallet_transactions
    FOR INSERT TO service_role
    WITH CHECK (true);

-- 4. Add function to automatically create vendor wallet when vendor is created
CREATE OR REPLACE FUNCTION public.create_vendor_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.vendor_wallets (vendor_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic wallet creation
CREATE TRIGGER create_vendor_wallet_trigger
    AFTER INSERT ON public.vendors
    FOR EACH ROW
    EXECUTE FUNCTION public.create_vendor_wallet();

-- 5. Add function to update vendor wallet when order is delivered
CREATE OR REPLACE FUNCTION public.update_vendor_wallet_on_order_delivery()
RETURNS TRIGGER AS $$
DECLARE
    v_vendor_id UUID;
    v_vendor_wallet_id UUID;
    v_current_earnings NUMERIC(10,2);
    v_order_total NUMERIC(10,2);
    v_platform_commission NUMERIC(10,2);
    v_vendor_earnings NUMERIC(10,2);
BEGIN
    -- Only process when order status changes to 'delivered'
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        -- Get vendor ID from order
        SELECT seller_id INTO v_vendor_id
        FROM public.orders
        WHERE id = NEW.id AND seller_type IN ('vendor', 'late_night_vendor', 'cafeteria');
        
        IF v_vendor_id IS NOT NULL THEN
            -- Get vendor wallet
            SELECT id, total_earnings INTO v_vendor_wallet_id, v_current_earnings
            FROM public.vendor_wallets
            WHERE vendor_id = v_vendor_id;
            
            IF v_vendor_wallet_id IS NOT NULL THEN
                -- Calculate earnings (total - platform commission)
                v_order_total := COALESCE(NEW.total, 0);
                v_platform_commission := COALESCE(NEW.platform_commission, 0);
                v_vendor_earnings := v_order_total - v_platform_commission;
                
                -- Update wallet
                UPDATE public.vendor_wallets
                SET 
                    total_earnings = total_earnings + v_vendor_earnings,
                    updated_at = NOW()
                WHERE id = v_vendor_wallet_id;
                
                -- Log transaction
                INSERT INTO public.vendor_wallet_transactions (
                    vendor_id,
                    order_id,
                    transaction_type,
                    amount,
                    balance_before,
                    balance_after,
                    description
                ) VALUES (
                    v_vendor_id,
                    NEW.id,
                    'credit',
                    v_vendor_earnings,
                    v_current_earnings,
                    v_current_earnings + v_vendor_earnings,
                    'Order completion payment'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet updates on order delivery
CREATE TRIGGER update_vendor_wallet_on_order_delivery_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_vendor_wallet_on_order_delivery();

-- 6. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id_status ON public.orders(seller_id, status) 
WHERE seller_type IN ('vendor', 'late_night_vendor', 'cafeteria');

CREATE INDEX IF NOT EXISTS idx_orders_customer_id_status ON public.orders(customer_id, status)
WHERE seller_type IN ('vendor', 'late_night_vendor', 'cafeteria');

-- 7. Grant necessary permissions
GRANT ALL ON public.vendor_wallets TO authenticated;
GRANT ALL ON public.vendor_reviews TO authenticated;
GRANT ALL ON public.vendor_wallet_transactions TO authenticated;
GRANT ALL ON public.vendor_wallets TO service_role;
GRANT ALL ON public.vendor_reviews TO service_role;
GRANT ALL ON public.vendor_wallet_transactions TO service_role;