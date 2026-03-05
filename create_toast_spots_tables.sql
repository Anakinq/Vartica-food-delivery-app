-- Toast Spots Database Tables
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Toast Vendors Table
CREATE TABLE toast_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hostel_location TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    price INTEGER DEFAULT 700,
    extras JSONB DEFAULT '{"butter": 100, "egg": 200, "tea": 300}',
    is_open BOOLEAN DEFAULT true,
    rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Toast Orders Table
CREATE TABLE toast_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES toast_vendors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_hostel TEXT,
    quantity INTEGER DEFAULT 1,
    extras JSONB DEFAULT '{}',
    subtotal INTEGER NOT NULL,
    delivery_fee INTEGER DEFAULT 100,
    total_price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for toast_vendors
ALTER TABLE toast_vendors ENABLE ROW LEVEL SECURITY;

-- Everyone can read toast vendors
CREATE POLICY "Public can read toast vendors" ON toast_vendors
    FOR SELECT USING (true);

-- Users can insert their own toast vendor profile
CREATE POLICY "Users can insert own toast vendor" ON toast_vendors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own toast vendor profile
CREATE POLICY "Users can update own toast vendor" ON toast_vendors
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for toast_orders
ALTER TABLE toast_orders ENABLE ROW LEVEL SECURITY;

-- Customers can read their own orders
CREATE POLICY "Customers can read own toast orders" ON toast_orders
    FOR SELECT USING (auth.uid() = user_id);

-- Vendors can read orders for their vendor profile
CREATE POLICY "Vendors can read own toast orders" ON toast_orders
    FOR SELECT USING (
        vendor_id IN (SELECT id FROM toast_vendors WHERE user_id = auth.uid())
    );

-- Customers can insert toast orders
CREATE POLICY "Customers can insert toast orders" ON toast_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Vendors can update status of their orders
CREATE POLICY "Vendors can update own toast order status" ON toast_orders
    FOR UPDATE USING (
        vendor_id IN (SELECT id FROM toast_vendors WHERE user_id = auth.uid())
    );

-- Create indexes for performance
CREATE INDEX idx_toast_vendors_hostel ON toast_vendors(hostel_location);
CREATE INDEX idx_toast_vendors_user ON toast_vendors(user_id);
CREATE INDEX idx_toast_orders_vendor ON toast_orders(vendor_id);
CREATE INDEX idx_toast_orders_user ON toast_orders(user_id);
CREATE INDEX idx_toast_orders_status ON toast_orders(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for toast_vendors
DROP TRIGGER IF EXISTS update_toast_vendors_updated_at ON toast_vendors;
CREATE TRIGGER update_toast_vendors_updated_at
    BEFORE UPDATE ON toast_vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for toast_orders
DROP TRIGGER IF EXISTS update_toast_orders_updated_at ON toast_orders;
CREATE TRIGGER update_toast_orders_updated_at
    BEFORE UPDATE ON toast_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample toast vendors (for testing)
INSERT INTO toast_vendors (name, hostel_location, phone, photo_url, price, is_open, rating, total_ratings)
VALUES 
    ('Mama T Toast', 'Wema Hostel', '08012345678', 'https://images.unsplash.com/photo-1517433670267-30f41c09da7e?w=400', 700, true, 4.7, 23),
    ('Night Toast Hub', 'Wema Hostel', '08023456789', 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400', 750, true, 4.5, 15),
    ('Abuad Toast Spot', 'Abuad Hostel', '08034567890', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400', 650, true, 4.3, 8),
    ('Fast Toast', 'Male Hostel 1', '08045678901', 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400', 700, false, 4.0, 5),
    ('Toast & Tea', 'New Female Hostel 1', '08056789012', 'https://images.unsplash.com/photo-1481070414801-51fd732d7184?w=400', 800, true, 4.8, 31);

-- Update toast_vendors set created_at for sample data
UPDATE toast_vendors SET created_at = NOW() - INTERVAL '1 day' * random() * 30;

SELECT 'Toast Spots tables created successfully!' as result;
