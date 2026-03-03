-- ============================================================================
-- BACKEND SECURITY FIX - Based on Backend Review Analysis
-- ============================================================================
-- This file fixes the following issues identified in the backend review:
-- 1. menu_items FOR ALL policy is too permissive (security gap)
-- 2. RLS needs to be enabled on key tables
-- 3. Policies need proper ownership checks
-- 4. Add missing indexes for performance
-- 5. Add explicit TO clauses for better security
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable RLS where needed
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cafeterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive menu_items policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'menu_items' AND p.polname = 'Cafeterias can manage own menu items') THEN
    EXECUTE 'ALTER TABLE public.menu_items DROP POLICY "Cafeterias can manage own menu items"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'menu_items' AND p.polname = 'Sellers manage own menu') THEN
    EXECUTE 'ALTER TABLE public.menu_items DROP POLICY "Sellers manage own menu"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'menu_items' AND p.polname = 'Sellers manage own menu items') THEN
    EXECUTE 'ALTER TABLE public.menu_items DROP POLICY "Sellers manage own menu items"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname = 'menu_items' AND p.polname = 'Sellers can insert menu items') THEN
    EXECUTE 'ALTER TABLE public.menu_items DROP POLICY "Sellers can insert menu items"';
  END IF;
END$$;

-- Ensure index on cafeterias.user_id for policy lookups
CREATE INDEX IF NOT EXISTS idx_cafeterias_user_id ON public.cafeterias(user_id);

-- Create explicit policies for cafeterias
CREATE POLICY IF NOT EXISTS cafeteria_select_menu_items ON public.menu_items
  FOR SELECT TO authenticated
  USING (
    seller_type = 'cafeteria'
    AND EXISTS (
      SELECT 1 FROM public.cafeterias c WHERE c.id = menu_items.seller_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS cafeteria_insert_menu_items ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_type = 'cafeteria'
    AND EXISTS (
      SELECT 1 FROM public.cafeterias c WHERE c.id = NEW.seller_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS cafeteria_update_menu_items ON public.menu_items
  FOR UPDATE TO authenticated
  USING (
    seller_type = 'cafeteria'
    AND EXISTS (
      SELECT 1 FROM public.cafeterias c WHERE c.id = menu_items.seller_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    seller_type = 'cafeteria'
    AND EXISTS (
      SELECT 1 FROM public.cafeterias c WHERE c.id = NEW.seller_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS cafeteria_delete_menu_items ON public.menu_items
  FOR DELETE TO authenticated
  USING (
    seller_type = 'cafeteria'
    AND EXISTS (
      SELECT 1 FROM public.cafeterias c WHERE c.id = menu_items.seller_id AND c.user_id = auth.uid()
    )
  );

-- Create explicit policies for vendors
CREATE POLICY IF NOT EXISTS vendor_select_menu_items ON public.menu_items
  FOR SELECT TO authenticated
  USING (
    seller_type = 'vendor'
    AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = menu_items.seller_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS vendor_insert_menu_items ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_type = 'vendor'
    AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = NEW.seller_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS vendor_update_menu_items ON public.menu_items
  FOR UPDATE TO authenticated
  USING (
    seller_type = 'vendor'
    AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = menu_items.seller_id AND v.user_id = auth.uid()
    )
  )
  WITH CHECK (
    seller_type = 'vendor'
    AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = NEW.seller_id AND v.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS vendor_delete_menu_items ON public.menu_items
  FOR DELETE TO authenticated
  USING (
    seller_type = 'vendor'
    AND EXISTS (
      SELECT 1 FROM public.vendors v WHERE v.id = menu_items.seller_id AND v.user_id = auth.uid()
    )
  );

-- Make public available menu_items readable by anon/authenticated where is_available = true
CREATE POLICY IF NOT EXISTS public_view_available_menu_items ON public.menu_items
  FOR SELECT TO anon, authenticated
  USING (is_available = true AND (
    (seller_type = 'cafeteria' AND EXISTS (SELECT 1 FROM public.cafeterias c WHERE c.id = menu_items.seller_id AND c.is_active = true))
    OR (seller_type = 'vendor' AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = menu_items.seller_id AND v.is_active = true))
  ));

-- Revoke execute on sensitive helper functions from public/anon if they exist (example: is_admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public, anon, authenticated';
  END IF;
END$$;

-- Final validation: list current policies for menu_items (returns rows to client)
SELECT pol.polname AS policy_name, pol.polcmd AS command, pg_get_expr(pol.polqual, pol.polrelid) AS using_expr, pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
WHERE c.relname = 'menu_items';
