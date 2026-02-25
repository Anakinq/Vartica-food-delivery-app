-- =====================================================
-- Supabase 500 Error Quick Fix SQL
-- Run these to fix common causes of 500 errors
-- =====================================================

-- =====================================================
-- Fix 1: Ensure RLS is enabled on all key tables
-- =====================================================

-- Profiles table
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Banners table
ALTER TABLE IF EXISTS public.banners ENABLE ROW LEVEL SECURITY;

-- Cafeterias table
ALTER TABLE IF EXISTS public.cafeterias ENABLE ROW LEVEL SECURITY;

-- Vendors table
ALTER TABLE IF EXISTS public.vendors ENABLE ROW LEVEL SECURITY;

-- Orders table
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

-- Order items table
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Fix 2: Create missing RLS policies for profiles
-- =====================================================

-- Drop existing policies if they exist (to recreate cleanly)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything on profiles" ON public.profiles;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role can do anything on profiles" 
    ON public.profiles FOR ALL 
    USING (auth.role() = 'service_role');

-- =====================================================
-- Fix 3: Create missing RLS policies for banners
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
DROP POLICY IF EXISTS "Service role can manage banners" ON public.banners;

CREATE POLICY "Anyone can view active banners" 
    ON public.banners FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage banners" 
    ON public.banners FOR ALL 
    USING (auth.role() = 'service_role');

-- =====================================================
-- Fix 4: Create missing RLS policies for cafeterias
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active cafeterias" ON public.cafeterias;
DROP POLICY IF EXISTS "Service role can manage cafeterias" ON public.cafeterias;

CREATE POLICY "Anyone can view active cafeterias" 
    ON public.cafeterias FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage cafeterias" 
    ON public.cafeterias FOR ALL 
    USING (auth.role() = 'service_role');

-- =====================================================
-- Fix 5: Create missing RLS policies for vendors
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active vendors" ON public.vendors;
DROP POLICY IF EXISTS "Vendors can update own vendor" ON public.vendors;
DROP POLICY IF EXISTS "Service role can manage vendors" ON public.vendors;

CREATE POLICY "Anyone can view active vendors" 
    ON public.vendors FOR SELECT USING (is_active = true AND application_status = 'approved');

CREATE POLICY "Vendors can update own vendor" 
    ON public.vendors FOR UPDATE USING (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

CREATE POLICY "Service role can manage vendors" 
    ON public.vendors FOR ALL 
    USING (auth.role() = 'service_role');

-- =====================================================
-- Fix 6: Ensure required indexes exist
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Banners indexes
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON public.banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON public.banners(display_order);

-- Cafeterias indexes
CREATE INDEX IF NOT EXISTS idx_cafeterias_is_active ON public.cafeterias(is_active);
CREATE INDEX IF NOT EXISTS idx_cafeterias_name ON public.cafeterias(name);

-- Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON public.vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_store_name ON public.vendors(store_name);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_application_status ON public.vendors(application_status);

-- =====================================================
-- Fix 7: Check and fix function issues
-- =====================================================

-- Check if handle_new_user function exists and is valid
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Fix 8: Clean up orphaned records that might cause issues
-- =====================================================

-- Delete profiles that don't have corresponding auth.users
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- =====================================================
-- Verify the fixes worked
-- =====================================================

SELECT 
    'Verification Results:' as status,
    tablename as table_name,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'banners', 'cafeterias', 'vendors')
ORDER BY tablename;
