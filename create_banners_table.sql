-- Create banners table for homepage carousel
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    image_url TEXT NOT NULL,
    link VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view active banners" ON banners
    FOR SELECT USING (is_active = true);

-- Function to check if banner is valid based on dates
CREATE OR REPLACE FUNCTION is_banner_valid(b banners)
RETURNS BOOLEAN AS $$
BEGIN
    -- If no date restrictions, always valid
    IF b.valid_from IS NULL AND b.valid_until IS NULL THEN
        RETURN true;
    END IF;
    
    -- Check valid_from
    IF b.valid_from IS NOT NULL AND NOW() < b.valid_from THEN
        RETURN false;
    END IF;
    
    -- Check valid_until
    IF b.valid_until IS NOT NULL AND NOW() > b.valid_until THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Updated SELECT policy that checks dates
DROP POLICY IF EXISTS "Public can view active banners" ON banners;
CREATE POLICY "Public can view active banners" ON banners
    FOR SELECT USING (is_active = true AND is_banner_valid(banners));

-- Admin full access (service role bypasses RLS)
CREATE POLICY "Service role full access to banners" ON banners
    FOR ALL USING (auth.role() = 'service_role');

-- Insert sample banners
INSERT INTO banners (title, subtitle, image_url, is_active, display_order) VALUES
('20% Off Today!', 'Main Cafeteria Promo', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', true, 1),
('Free Delivery', 'On orders above ₦2000', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', true, 2),
('Late Night Specials', 'Order now for midnight snacks', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', true, 3)
ON CONFLICT DO NOTHING;

-- Create API endpoint for banners
-- This will be handled by the frontend calling supabase directly
-- but we can also create an edge function if needed
